import { Hono } from 'hono';
import { DisscoCSRepository } from '../db.js';
import { requireSiteAdmin, resolveSiteId } from '../jwt.js';
import { AnnouncementBody, isAnnouncementTargetType, parseAnnouncementBody } from '../validators.js';

export function announcementsRoutes(repository: DisscoCSRepository): Hono {
  const app = new Hono();

  app.get('/active', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const targetType = c.req.query('target');
    if (!isAnnouncementTargetType(targetType)) {
      return c.text('target must be one of homepage, projects, project', 400);
    }

    const targetProjectSlug = c.req.query('projectSlug') ?? null;
    if (targetType === 'project' && !targetProjectSlug) {
      return c.text('projectSlug is required when target is project', 400);
    }

    const announcements = await repository.announcements.listActiveAnnouncements(
      siteId,
      targetType,
      targetType === 'project' ? targetProjectSlug : null
    );
    return c.json({ announcements });
  });

  app.get('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const announcements = await repository.announcements.listAnnouncements(identity.siteId);
    return c.json({ announcements });
  });

  app.post('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const payload = parseAnnouncementBody((await c.req.json().catch(() => null)) as AnnouncementBody | null);
    if (!payload) {
      return c.text('Invalid announcement payload', 400);
    }

    const announcement = await repository.announcements.createAnnouncement({ siteId: identity.siteId, ...payload });
    return c.json(announcement, 201);
  });

  app.put('/:id', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) {
      return c.notFound();
    }

    const payload = parseAnnouncementBody((await c.req.json().catch(() => null)) as AnnouncementBody | null);
    if (!payload) {
      return c.text('Invalid announcement payload', 400);
    }

    const announcement = await repository.announcements.updateAnnouncement(identity.siteId, id, payload);
    if (!announcement) {
      return c.notFound();
    }

    return c.json(announcement);
  });

  app.delete('/:id', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) {
      return c.notFound();
    }

    const deleted = await repository.announcements.deleteAnnouncement(identity.siteId, id);
    if (!deleted) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  return app;
}
