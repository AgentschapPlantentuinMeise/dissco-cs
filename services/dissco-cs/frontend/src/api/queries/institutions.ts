import { queryOptions } from '@tanstack/react-query';
import { institutionsApi } from '../cs-client/institutions';

export const institutionKeys = {
  all: ['institutions'] as const,
  active: () => [...institutionKeys.all, 'active'] as const,
  detail: (slug: string | undefined) => [...institutionKeys.all, 'detail', slug] as const,
  projectSlugs: (slug: string | undefined) => [...institutionKeys.all, 'project-slugs', slug] as const,
  admin: () => [...institutionKeys.all, 'admin'] as const,
};

export const institutionQueries = {
  active: () => queryOptions({ queryKey: institutionKeys.active(), queryFn: () => institutionsApi.listActive() }),

  detail: (slug: string | undefined) =>
    queryOptions({ queryKey: institutionKeys.detail(slug), queryFn: () => institutionsApi.getActive(slug!), enabled: !!slug }),

  projectSlugs: (slug: string | undefined) =>
    queryOptions({
      queryKey: institutionKeys.projectSlugs(slug),
      queryFn: () => institutionsApi.getActiveProjectSlugs(slug!),
      enabled: !!slug,
    }),

  admin: () => queryOptions({ queryKey: institutionKeys.admin(), queryFn: () => institutionsApi.listAdmin() }),
};
