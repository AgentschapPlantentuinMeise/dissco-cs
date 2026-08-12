import { Hono } from 'hono';
import { DisscoCSRepository } from '../db.js';
import { requireSiteAdmin, resolveSiteId } from '../jwt.js';
import { SitePageLang } from '../repositories/site-pages.repository.js';
import {
  isSitePageLang,
  MAX_MANUAL_ATTACHMENT_LENGTH,
  parsePruneProjectLinksBody,
  parseSetManualContentBody,
  parseSetManualLinkBody,
  parseSetManualTitleBody,
  PruneProjectLinksBody,
  SetManualContentBody,
  SetManualLinkBody,
  SetManualTitleBody,
} from '../validators.js';

export function projectManualsRoutes(repository: DisscoCSRepository): Hono {
  const app = new Hono();

  // ---- volunteer-facing (public, JWT-optional via resolveSiteId) ----

  app.get('/projects/:projectId/manual', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const manual = await repository.projectManuals.getManualForProject(siteId, c.req.param('projectId'));
    if (!manual) {
      return c.notFound();
    }

    const attachmentMeta = await repository.projectManuals.listAttachmentMeta(manual.id);
    const attachments: Partial<Record<SitePageLang, { filename: string; mimeType: string; size: number }>> = {};
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

    const manual = await repository.projectManuals.getManualForProject(siteId, c.req.param('projectId'));
    if (!manual) {
      return c.notFound();
    }

    const file = await repository.projectManuals.getAttachmentFile(manual.id, lang);
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

    const payload = parseSetManualLinkBody((await c.req.json().catch(() => null)) as SetManualLinkBody | null);
    if (!payload) {
      return c.text('Invalid payload', 400);
    }

    if (payload.manualId !== null) {
      const manual = await repository.projectManuals.getManualById(identity.siteId, payload.manualId);
      if (!manual) {
        return c.text('Manual not found', 404);
      }
    }

    await repository.projectManuals.setProjectLink(identity.siteId, c.req.param('projectId'), payload.manualId);
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

    const payload = parsePruneProjectLinksBody((await c.req.json().catch(() => null)) as PruneProjectLinksBody | null);
    if (!payload) {
      return c.text('Invalid payload', 400);
    }

    const removed = await repository.projectManuals.pruneOrphanedProjectLinks(identity.siteId, payload.liveSlugs);
    return c.json({ removed });
  });

  // ---- admin: manual library ----

  app.get('/manuals', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const manuals = await repository.projectManuals.listManuals(identity.siteId);
    return c.json({ manuals });
  });

  app.post('/manuals', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const payload = parseSetManualTitleBody((await c.req.json().catch(() => null)) as SetManualTitleBody | null);
    if (!payload) {
      return c.text('Invalid payload', 400);
    }

    const manual = await repository.projectManuals.createManual(identity.siteId, { [payload.lang]: payload.title });
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

    const manual = await repository.projectManuals.getManualById(identity.siteId, manualId);
    if (!manual) {
      return c.notFound();
    }

    const attachmentMeta = await repository.projectManuals.listAttachmentMeta(manual.id);
    const attachments: Partial<Record<SitePageLang, { filename: string; mimeType: string; size: number }>> = {};
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

    const deleted = await repository.projectManuals.deleteManual(identity.siteId, manualId);
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

    const payload = parseSetManualTitleBody((await c.req.json().catch(() => null)) as SetManualTitleBody | null);
    if (!payload) {
      return c.text('Invalid payload', 400);
    }

    const manual = await repository.projectManuals.updateManualTitle(identity.siteId, manualId, payload.lang, payload.title);
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

    const payload = parseSetManualContentBody((await c.req.json().catch(() => null)) as SetManualContentBody | null);
    if (!payload) {
      return c.text('Invalid payload', 400);
    }

    const updated = await repository.projectManuals.updateManualContent(identity.siteId, manualId, lang, payload.content);
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

    const manual = await repository.projectManuals.getManualById(identity.siteId, manualId);
    if (!manual) {
      return c.notFound();
    }

    const body = await c.req.parseBody().catch(() => null);
    const file = body?.file;
    if (!(file instanceof File)) {
      return c.text('Missing file', 400);
    }

    if (file.size > MAX_MANUAL_ATTACHMENT_LENGTH) {
      return c.text('File too large', 413);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await repository.projectManuals.upsertAttachment(manualId, lang, {
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

    const manual = await repository.projectManuals.getManualById(identity.siteId, manualId);
    if (!manual) {
      return c.notFound();
    }

    await repository.projectManuals.deleteAttachment(manualId, lang);
    return c.body(null, 204);
  });

  return app;
}
