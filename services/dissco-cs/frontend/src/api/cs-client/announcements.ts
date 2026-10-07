import { csFetch } from './request';
import { getSiteSlug } from '../slug';
import { AnnouncementTargetType, AnnouncementDto, AnnouncementInput } from '@dissco-cs/shared-types';

export const announcementsApi = {
  listAdmin: () => csFetch<{ announcements: AnnouncementDto[] }>('/announcements'),

  listActive: (target: AnnouncementTargetType, projectSlug?: string) =>
    csFetch<{ announcements: AnnouncementDto[] }>(
      `/announcements/active?slug=${getSiteSlug()}&target=${target}${
        projectSlug ? `&projectSlug=${encodeURIComponent(projectSlug)}` : ''
      }`
    ),

  create: (data: AnnouncementInput) =>
    csFetch<AnnouncementDto>('/announcements', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: AnnouncementDto['id'], data: AnnouncementInput) =>
    csFetch<AnnouncementDto>(`/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: AnnouncementDto['id']) => csFetch<void>(`/announcements/${id}`, { method: 'DELETE' }),
};
