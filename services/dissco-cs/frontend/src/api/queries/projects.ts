import { queryOptions } from '@tanstack/react-query';
import { projectsApi } from '../cs-client/projects';

type ProjectListFilter = { published?: boolean };

// Every project query key starts with 'projects', so invalidating projectKeys.all refreshes lists,
// details, progress and links in one go.
export const projectKeys = {
  all: ['projects'] as const,
  list: (filter: ProjectListFilter & { page: number }) => [...projectKeys.all, 'list', filter] as const,
  listAll: (filter: ProjectListFilter) => [...projectKeys.all, 'list-all', filter] as const,
  detail: (projectId: string | number | undefined) => [...projectKeys.all, 'detail', String(projectId)] as const,
  progress: (projectId: string | number | undefined) => [...projectKeys.all, 'progress', String(projectId)] as const,
  taskDebug: (projectId: string | number | undefined) => [...projectKeys.all, 'task-debug', String(projectId)] as const,
  manuals: () => [...projectKeys.all, 'manual'] as const,
  manual: (projectSlug: string | undefined) => [...projectKeys.manuals(), projectSlug] as const,
  institution: (projectSlug: string | undefined) => [...projectKeys.all, 'institution', projectSlug] as const,
  institutionLinks: () => [...projectKeys.all, 'institution-links'] as const,
  prepareClaim: (projectId: string | number | undefined, manifestId: number | undefined) =>
    [...projectKeys.all, 'prepare-claim', String(projectId), manifestId] as const,
};

export const projectQueries = {
  list: (filter: ProjectListFilter & { page: number }) =>
    queryOptions({ queryKey: projectKeys.list(filter), queryFn: () => projectsApi.list(filter) }),

  // Every page at once (the backend walks Madoc's pagination).
  listAll: (filter: ProjectListFilter = {}) =>
    queryOptions({ queryKey: projectKeys.listAll(filter), queryFn: () => projectsApi.listAll(filter) }),

  detail: (projectId: string | number | undefined) =>
    queryOptions({ queryKey: projectKeys.detail(projectId), queryFn: () => projectsApi.get(projectId!), enabled: !!projectId }),

  progress: (projectId: string | number | undefined) =>
    queryOptions({
      queryKey: projectKeys.progress(projectId),
      queryFn: ({ signal }) => projectsApi.getProgress(projectId!, signal),
      enabled: !!projectId,
    }),

  taskDebug: (projectId: string | number | undefined) =>
    queryOptions({ queryKey: projectKeys.taskDebug(projectId), queryFn: () => projectsApi.getTaskDebug(projectId!), enabled: !!projectId }),

  manual: (projectSlug: string | undefined) =>
    queryOptions({ queryKey: projectKeys.manual(projectSlug), queryFn: () => projectsApi.getManual(projectSlug!), enabled: !!projectSlug }),

  institution: (projectSlug: string | undefined) =>
    queryOptions({
      queryKey: projectKeys.institution(projectSlug),
      queryFn: () => projectsApi.getInstitution(projectSlug!),
      enabled: !!projectSlug,
    }),

  institutionLinks: () => queryOptions({ queryKey: projectKeys.institutionLinks(), queryFn: () => projectsApi.listInstitutionLinks() }),

  // A POST used as a read: makes sure the capture model for this claim exists and returns its id.
  prepareClaim: (projectId: string | number | undefined, manifestId: number | undefined) =>
    queryOptions({
      queryKey: projectKeys.prepareClaim(projectId, manifestId),
      queryFn: () => projectsApi.prepareClaim(projectId!, { manifestId }),
      enabled: !!projectId && !!manifestId,
    }),
};
