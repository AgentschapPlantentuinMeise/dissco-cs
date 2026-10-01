import { Hono } from 'hono';
import { DisscoCSRepository } from '../db.js';
import { requireSiteAdmin, resolveSiteId } from '../jwt.js';
import {
  attachmentFileSchema,
  PerLanguage,
  ManualAttachmentDto,
  setManualContentSchema,
  setManualTitleSchema,
} from '@dissco-cs/shared-types';
import { isSitePageLang, pruneProjectLinksSchema, setManualLinkSchema } from '../validators.js';

export function manualsRoutes(repository: DisscoCSRepository): Hono {
  const app = new Hono();

  // ---- volunteer-facing (public, JWT-optional via resolveSiteId) ----

  app.get('/projects/:projectId/manual', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const manual = await repository.manuals.getManualForProject(siteId, c.req.param('projectId'));
    if (!manual) {
      return c.notFound();
    }

    const attachmentMeta = await repository.manuals.listAttachmentMeta(manual.id);
    const attachments: PerLanguage<ManualAttachmentDto> = {};
    for (const meta of attachmentMeta) {
      attachments[meta.lang] = { filename: meta.filename, mimeType: meta.mime_type, size: meta.file_size };
    }

    return c.json({ id: manual.id, title: manual.title, content: manual.content, attachments });
  });

  app.get('/projects/:projectId/manual/attachment/:lang', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const lang = c.req.param('lang');
    if (!isSitePageLang(lang)) {
      return c.notFound();
    }

    const manual = await repository.manuals.getManualForProject(siteId, c.req.param('projectId'));
    if (!manual) {
      return c.notFound();
    }

    const file = await repository.manuals.getAttachmentFile(manual.id, lang);
    if (!file) {
      return c.notFound();
    }

    c.header('Content-Type', file.mimeType);
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
    return c.body(new Uint8Array(file.buffer));
  });

  // ---- admin: link a project to a manual (or unlink with manualId: null) ----

  app.put('/projects/:projectId/manual-link', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const result = setManualLinkSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('Invalid payload', 400);
    }

    if (result.data.manualId !== null) {
      const manual = await repository.manuals.getManualById(identity.siteId, result.data.manualId);
      if (!manual) {
        return c.text('Manual not found', 404);
      }
    }

    await repository.manuals.setProjectLink(identity.siteId, c.req.param('projectId'), result.data.manualId);
    return c.body(null, 204);
  });

  // Ruimt links op naar projecten die niet meer in de meegegeven live-Madoc-lijst voorkomen --
  // zie institutions.routes.ts /project-links/prune voor dezelfde achtergrond-aanroep vanuit de
  // projectbeheer-pagina.
  app.put('/projects/manual-links/prune', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const result = pruneProjectLinksSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('Invalid payload', 400);
    }

    const removed = await repository.manuals.pruneOrphanedProjectLinks(identity.siteId, result.data.liveSlugs);
    return c.json({ removed });
  });

  // ---- admin: manual library ----

  app.get('/manuals', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const manuals = await repository.manuals.listManuals(identity.siteId);
    return c.json({ manuals });
  });

  app.post('/manuals', async c => {
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

  app.get('/manuals/:manualId', async c => {
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

  app.delete('/manuals/:manualId', async c => {
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

  app.put('/manuals/:manualId/title', async c => {
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

  app.put('/manuals/:manualId/:lang', async c => {
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

  app.put('/manuals/:manualId/:lang/attachment', async c => {
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

  app.delete('/manuals/:manualId/:lang/attachment', async c => {
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
