import { Hono } from 'hono';
import { DisscoCSRepository } from '../db.js';
import { requireSiteAdmin } from '../jwt.js';
import {
  attachmentFileSchema,
  PerLanguage,
  ManualAttachmentDto,
  setManualContentSchema,
  setManualTitleSchema,
} from '@dissco-cs/shared-types';
import { isSitePageLang } from '../validators.js';

// The manual library (admin). Reading a project's manual and linking it to a project live in
// projects.controller.ts (/projects/:projectId/manual).
export function manualsController(repository: DisscoCSRepository): Hono {
  const app = new Hono();

  app.get('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const manuals = await repository.manuals.listManuals(identity.siteId);
    return c.json({ manuals });
  });

  app.post('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const result = setManualTitleSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('Invalid payload', 400);
    }

    const manual = await repository.manuals.createManual(identity.siteId, { [result.data.lang]: result.data.title });
    return c.json(manual, 201);
  });

  app.get('/:manualId', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const manualId = Number(c.req.param('manualId'));
    if (!Number.isInteger(manualId)) {
      return c.notFound();
    }

    const manual = await repository.manuals.getManualById(identity.siteId, manualId);
    if (!manual) {
      return c.notFound();
    }

    const attachmentMeta = await repository.manuals.listAttachmentMeta(manual.id);
    const attachments: PerLanguage<ManualAttachmentDto> = {};
    for (const meta of attachmentMeta) {
      attachments[meta.lang] = { filename: meta.filename, mimeType: meta.mime_type, size: meta.file_size };
    }

    return c.json({ ...manual, attachments });
  });

  app.delete('/:manualId', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const manualId = Number(c.req.param('manualId'));
    if (!Number.isInteger(manualId)) {
      return c.notFound();
    }

    const deleted = await repository.manuals.deleteManual(identity.siteId, manualId);
    if (!deleted) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  app.put('/:manualId/title', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const manualId = Number(c.req.param('manualId'));
    if (!Number.isInteger(manualId)) {
      return c.notFound();
    }

    const result = setManualTitleSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('Invalid payload', 400);
    }

    const manual = await repository.manuals.updateManualTitle(identity.siteId, manualId, result.data.lang, result.data.title);
    if (!manual) {
      return c.notFound();
    }

    return c.json(manual);
  });

  app.put('/:manualId/:lang', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const manualId = Number(c.req.param('manualId'));
    const lang = c.req.param('lang');
    if (!Number.isInteger(manualId) || !isSitePageLang(lang)) {
      return c.notFound();
    }

    const result = setManualContentSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('Invalid payload', 400);
    }

    const updated = await repository.manuals.updateManualContent(identity.siteId, manualId, lang, result.data.content);
    if (!updated) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  app.put('/:manualId/:lang/attachment', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const manualId = Number(c.req.param('manualId'));
    const lang = c.req.param('lang');
    if (!Number.isInteger(manualId) || !isSitePageLang(lang)) {
      return c.notFound();
    }

    const manual = await repository.manuals.getManualById(identity.siteId, manualId);
    if (!manual) {
      return c.notFound();
    }

    const body = await c.req.parseBody().catch(() => null);
    const file = body?.file;
    if (!(file instanceof File)) {
      return c.text('Missing file', 400);
    }

    if (!attachmentFileSchema.safeParse(file).success) {
      return c.text('File too large', 413);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await repository.manuals.upsertAttachment(manualId, lang, {
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      buffer,
    });

    return c.body(null, 204);
  });

  app.delete('/:manualId/:lang/attachment', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const manualId = Number(c.req.param('manualId'));
    const lang = c.req.param('lang');
    if (!Number.isInteger(manualId) || !isSitePageLang(lang)) {
      return c.notFound();
    }

    const manual = await repository.manuals.getManualById(identity.siteId, manualId);
    if (!manual) {
      return c.notFound();
    }

    await repository.manuals.deleteAttachment(manualId, lang);
    return c.body(null, 204);
  });

  return app;
}
