import { csFetch, csFetchField } from './request';
import { urlPath, withSite } from '../url';
import { AnnouncementTargetType, AnnouncementDto, AnnouncementInput } from '@dissco-cs/shared-types';

export const announcementsApi = {
  /**
   * Every announcement of this site, active or not, newest first -- for the management page.
   * Input: none.
   * Who: site admin.
   * Returns: AnnouncementDto[].
   */
  listAdmin: () => csFetchField<AnnouncementDto[]>('/announcements', 'announcements'),

  /**
   * The announcements to show on one place of the public site right now: active, and today
   * between their start and end date (an empty date means no limit). Newest first.
   * @param target where they are shown: 'homepage', 'projects' (the project list) or 'project'
   *   (one project page)
   * @param projectSlug the project, required when target is 'project'
   * Who: anyone.
   * Returns: AnnouncementDto[].
   */
  listActive: (target: AnnouncementTargetType, projectSlug?: string) =>
    csFetchField<AnnouncementDto[]>(withSite('/announcements/active', { target, projectSlug }), 'announcements'),

  /**
   * Creates an announcement.
   * @param data title and description filled in every language; targetType, plus
   *   targetProjectSlug when it is 'project'; isActive; startDate and endDate as ISO date or null
   *   (a date-only endDate counts until the end of that day). Validated by announcementInputSchema.
   * Who: site admin.
   * Returns: the new AnnouncementDto (201).
   */
  create: (data: AnnouncementInput) =>
    csFetch<AnnouncementDto>('/announcements', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Replaces an announcement completely.
   * @param id the announcement (AnnouncementDto.id)
   * @param data the full announcement, same fields and rules as create
   * Who: site admin.
   * Returns: nothing (204); 404 when it is not on this site.
   */
  update: (id: AnnouncementDto['id'], data: AnnouncementInput) =>
    csFetch<void>(urlPath`/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /**
   * Deletes an announcement.
   * @param id the announcement (AnnouncementDto.id)
   * Who: site admin.
   * Returns: nothing (204); 404 when it is not on this site.
   */
  delete: (id: AnnouncementDto['id']) => csFetch<void>(urlPath`/announcements/${id}`, { method: 'DELETE' }),
};
