import { queryOptions } from '@tanstack/react-query';
import { announcementsApi } from '../cs-client/announcements';
import { AnnouncementTargetType } from '@dissco-cs/shared-types';

export const announcementKeys = {
  all: ['announcements'] as const,
  admin: () => [...announcementKeys.all, 'admin'] as const,
  active: (target: AnnouncementTargetType, projectSlug?: string) => [...announcementKeys.all, 'active', target, projectSlug ?? null] as const,
};

export const announcementQueries = {
  admin: () => queryOptions({ queryKey: announcementKeys.admin(), queryFn: () => announcementsApi.listAdmin() }),
  active: (target: AnnouncementTargetType, projectSlug?: string) =>
    queryOptions({ queryKey: announcementKeys.active(target, projectSlug), queryFn: () => announcementsApi.listActive(target, projectSlug) }),
};
