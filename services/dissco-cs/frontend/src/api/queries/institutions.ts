import { queryOptions } from '@tanstack/react-query';
import { institutionsApi } from '../cs-client/institutions';
import { STATIC } from './freshness';

export const institutionKeys = {
  all: ['institutions'] as const,
  active: () => [...institutionKeys.all, 'active'] as const,
  detail: (slug: string | undefined) => [...institutionKeys.all, 'detail', slug] as const,
  projectSlugs: (slug: string | undefined) => [...institutionKeys.all, 'project-slugs', slug] as const,
  admin: () => [...institutionKeys.all, 'admin'] as const,
};

export const institutionQueries = {
  active: () => queryOptions({ queryKey: institutionKeys.active(), queryFn: () => institutionsApi.listActive(), ...STATIC }),

  detail: (slug: string | undefined) =>
    queryOptions({ queryKey: institutionKeys.detail(slug), queryFn: () => institutionsApi.getActive(slug!), enabled: !!slug, ...STATIC }),

  projectSlugs: (slug: string | undefined) =>
    queryOptions({
      queryKey: institutionKeys.projectSlugs(slug),
      queryFn: () => institutionsApi.listActiveProjectSlugs(slug!),
      enabled: !!slug,
      ...STATIC,
    }),

  admin: () => queryOptions({ queryKey: institutionKeys.admin(), queryFn: () => institutionsApi.listAdmin(), ...STATIC }),
};
