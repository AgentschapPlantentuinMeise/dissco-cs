import { Hono } from 'hono';
import type { Context } from 'hono';
import {
  ManualAttachmentUpload,
  ManualsRepository,
  toManualDetailDto,
  toManualDto,
  toManualSummaryDto,
} from '../repositories/manuals.repository.js';
import { requireSiteAdmin } from '../auth/auth.js';
import { intId, validateParams } from '../infrastructure/validate-params.js';
import { MultipartBody, validateMultipart } from '../infrastructure/validate-multipart.js';
import { checkUpload, uploadLimit } from '../infrastructure/file-http.js';
import { planManualAttachments } from './manuals.logic.js';
import {
  MANUAL_ATTACHMENT_MIME_TYPES,
  MAX_MANUAL_ATTACHMENT_LENGTH,
  MAX_MANUAL_CONTENT_LENGTH,
  ManualSave,
  SITE_PAGE_LANGS,
  SitePageLang,
  manualAttachmentField,
  manualSaveSchema,
} from '@dissco-cs/shared-types';

// A save carries every language's attachment and text at once. A Markdown character takes at most
// 3 bytes in UTF-8. The gateway's limit for this route (dissco-cs-api.conf) must stay above this.
const MAX_MANUAL_SAVE_SIZE = SITE_PAGE_LANGS.length * (MAX_MANUAL_ATTACHMENT_LENGTH + 3 * MAX_MANUAL_CONTENT_LENGTH);

export function manualsController(manualsRepository: ManualsRepository): Hono {
  const app = new Hono();

  // Checks the whole save before anything is written (400, 413, 415), then saves it as one.
  // Returns the saved row, null when manualId is not on this site, or the error Response.
  async function save(
    c: Context,
    siteId: number,
    manualId: number | null,
    stored: SitePageLang[],
    { data, files }: MultipartBody<ManualSave>
  ) {
    const uploads: ManualAttachmentUpload[] = [];
    for (const lang of SITE_PAGE_LANGS) {
      const file = files[manualAttachmentField(lang)];
      if (!file) continue;
      const upload = await checkUpload(c, file, MAX_MANUAL_ATTACHMENT_LENGTH, MANUAL_ATTACHMENT_MIME_TYPES);
      if (upload instanceof Response) {
        return upload;
      }
      uploads.push({ ...upload, lang });
    }

    const plan = planManualAttachments(data.content, stored, uploads.map(upload => upload.lang), data.removeAttachments);
    if (!plan.ok) {
      return c.json({ error: plan.error }, 400);
    }

    return manualsRepository.saveManual(siteId, manualId, { title: data.title, content: data.content }, uploads, plan.remove);
  }

  app.get('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const manuals = await manualsRepository.listManuals(identity.siteId);
    return c.json({ manuals: manuals.map(toManualSummaryDto) });
  });

  app.post('/', uploadLimit(MAX_MANUAL_SAVE_SIZE), validateMultipart(manualSaveSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const saved = await save(c, identity.siteId, null, [], c.req.valid('form'));
    if (saved instanceof Response) {
      return saved;
    }
    if (!saved) {
      return c.notFound();
    }

    return c.json(toManualDto(saved), 201);
  });

  app.put(
    '/:manualId',
    validateParams({ manualId: intId }),
    uploadLimit(MAX_MANUAL_SAVE_SIZE),
    validateMultipart(manualSaveSchema),
    async c => {
      const identity = requireSiteAdmin(c);
      if (identity instanceof Response) {
        return identity;
      }

      const { manualId } = c.req.valid('param');

      const manual = await manualsRepository.getManualById(identity.siteId, manualId);
      if (!manual) {
        return c.notFound();
      }

      const stored = (await manualsRepository.listAttachmentMeta(manualId)).map(meta => meta.lang);
      const saved = await save(c, identity.siteId, manualId, stored, c.req.valid('form'));
      if (saved instanceof Response) {
        return saved;
      }
      if (!saved) {
        return c.notFound();
      }

      return c.body(null, 204);
    }
  );

  app.get('/:manualId', validateParams({ manualId: intId }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { manualId } = c.req.valid('param');

    const manual = await manualsRepository.getManualById(identity.siteId, manualId);
    if (!manual) {
      return c.notFound();
    }

    return c.json(toManualDetailDto(manual, await manualsRepository.listAttachmentMeta(manual.id)));
  });

  app.delete('/:manualId', validateParams({ manualId: intId }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { manualId } = c.req.valid('param');

    const deleted = await manualsRepository.deleteManual(identity.siteId, manualId);
    if (!deleted) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  return app;
}
