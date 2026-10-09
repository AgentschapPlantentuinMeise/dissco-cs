import { Hono } from 'hono';
import { requireSiteAdmin, resolveSiteId } from '../auth/auth.js';
import { AnnouncementsRepository, AnnouncementRow } from '../repositories/announcements.repository.js';
import { AnnouncementDto, announcementInputSchema, isAnnouncementTargetType } from '@dissco-cs/shared-types';

// created_at is DB bookkeeping (see AnnouncementRow), never part of the wire DTO.
function toAnnouncementDto(row: AnnouncementRow): AnnouncementDto {
  const { created_at, start_date, end_date, ...rest } = row;
  return {
    ...rest,
    start_date: start_date ? start_date.toISOString() : null,
    end_date: end_date ? end_date.toISOString() : null,
  };
}

export function announcementsController(announcementsRepository: AnnouncementsRepository): Hono {
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

  app.post('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const result = announcementInputSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('Invalid announcement payload', 400);
    }

    const announcement = await announcementsRepository.createAnnouncement({ siteId: identity.siteId, ...result.data });
    return c.json(toAnnouncementDto(announcement), 201);
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

    const result = announcementInputSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('Invalid announcement payload', 400);
    }

    const announcement = await announcementsRepository.updateAnnouncement(identity.siteId, id, result.data);
    if (!announcement) {
      return c.notFound();
    }

    return c.json(toAnnouncementDto(announcement));
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

    const deleted = await announcementsRepository.deleteAnnouncement(identity.siteId, id);
    if (!deleted) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  return app;
}
