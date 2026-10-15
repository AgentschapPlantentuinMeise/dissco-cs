import { Hono } from 'hono';
import { ManualsRepository, toManualDetailDto, toManualDto, toManualSummaryDto } from '../repositories/manuals.repository.js';
import { requireSiteAdmin } from '../auth/auth.js';
import { validateJson } from '../infrastructure/validate-json.js';
import { intId, siteLang, validateParams } from '../infrastructure/validate-params.js';
import { attachmentFileSchema, setManualContentSchema, setManualTitleSchema } from '@dissco-cs/shared-types';

// The manual library (admin). Reading a project's manual and linking it to a project live in
// projects.controller.ts (/projects/:projectId/manual).
export function manualsController(manualsRepository: ManualsRepository): Hono {
  const app = new Hono();

  app.get('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const manuals = await manualsRepository.listManuals(identity.siteId);
    return c.json({ manuals: manuals.map(toManualSummaryDto) });
  });

  app.post('/', validateJson(setManualTitleSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const input = c.req.valid('json');

    const manual = await manualsRepository.createManual(identity.siteId, { [input.lang]: input.title });
    return c.json(toManualDto(manual), 201);
  });

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

  app.put('/:manualId/:lang', validateParams({ manualId: intId, lang: siteLang }), validateJson(setManualContentSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { manualId, lang } = c.req.valid('param');

    const input = c.req.valid('json');

    const updated = await manualsRepository.updateManualContent(identity.siteId, manualId, lang, input.content);
    if (!updated) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  app.put('/:manualId/:lang/attachment', validateParams({ manualId: intId, lang: siteLang }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { manualId, lang } = c.req.valid('param');

    const manual = await manualsRepository.getManualById(identity.siteId, manualId);
    if (!manual) {
      return c.notFound();
    }

    const body = await c.req.parseBody().catch(() => null);
    const file = body?.file;
    if (!(file instanceof File)) {
      return c.json({ error: 'Missing file' }, 400);
    }

    if (!attachmentFileSchema.safeParse(file).success) {
      return c.json({ error: 'File too large' }, 413);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await manualsRepository.upsertAttachment(manualId, lang, {
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      buffer,
    });

    return c.body(null, 204);
  });

  app.delete('/:manualId/:lang/attachment', validateParams({ manualId: intId, lang: siteLang }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { manualId, lang } = c.req.valid('param');

    const manual = await manualsRepository.getManualById(identity.siteId, manualId);
    if (!manual) {
      return c.notFound();
    }

    await manualsRepository.deleteAttachment(manualId, lang);
    return c.body(null, 204);
  });

  return app;
}
