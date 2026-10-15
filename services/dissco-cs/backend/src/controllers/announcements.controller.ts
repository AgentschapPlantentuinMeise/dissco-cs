import { Hono } from 'hono';
import { requireSiteAdmin, requireSiteId } from '../auth/auth.js';
import { AnnouncementsRepository, toAnnouncementDto } from '../repositories/announcements.repository.js';
import { validateJson } from '../infrastructure/validate-json.js';
import { intId, validateParams } from '../infrastructure/validate-params.js';
import { announcementInputSchema, isAnnouncementTargetType } from '@dissco-cs/shared-types';

export function announcementsController(announcementsRepository: AnnouncementsRepository): Hono {
  const app = new Hono();

  app.get('/active', async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const targetType = c.req.query('target');
    if (!isAnnouncementTargetType(targetType)) {
      return c.json({ error: 'target must be one of homepage, projects, project' }, 400);
    }

    const targetProjectSlug = c.req.query('projectSlug') ?? null;
    if (targetType === 'project' && !targetProjectSlug) {
      return c.json({ error: 'projectSlug is required when target is project' }, 400);
    }

    const announcements = await announcementsRepository.listActiveAnnouncements(
      siteId,
      targetType,
      targetType === 'project' ? targetProjectSlug : null
    );
    return c.json({ announcements: announcements.map(toAnnouncementDto) });
  });

  app.get('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const announcements = await announcementsRepository.listAnnouncements(identity.siteId);
    return c.json({ announcements: announcements.map(toAnnouncementDto) });
  });

  app.post('/', validateJson(announcementInputSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const input = c.req.valid('json');

    const announcement = await announcementsRepository.createAnnouncement({ siteId: identity.siteId, ...input });
    return c.json(toAnnouncementDto(announcement), 201);
  });

  app.put('/:id', validateParams({ id: intId }), validateJson(announcementInputSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { id } = c.req.valid('param');

    const input = c.req.valid('json');

    const announcement = await announcementsRepository.updateAnnouncement(identity.siteId, id, input);
    if (!announcement) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  app.delete('/:id', validateParams({ id: intId }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { id } = c.req.valid('param');

    const deleted = await announcementsRepository.deleteAnnouncement(identity.siteId, id);
    if (!deleted) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  return app;
}
