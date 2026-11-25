import { queryOptions } from '@tanstack/react-query';
import { projectsApi } from '../cs-client/projects';

type ProjectListFilter = { published?: boolean };

// Every project query key starts with 'projects', so invalidating projectKeys.all refreshes lists,
// details, progress and links in one go. Except prepareClaim: see projectQueries.prepareClaim.
export const projectKeys = {
  all: ['projects'] as const,
  list: (filter: ProjectListFilter & { page: number }) => [...projectKeys.all, 'list', filter] as const,
  listAll: (filter: ProjectListFilter) => [...projectKeys.all, 'list-all', filter] as const,
  detail: (projectId: string | number | undefined) => [...projectKeys.all, 'detail', String(projectId)] as const,
  progress: (projectId: string | number | undefined) => [...projectKeys.all, 'progress', String(projectId)] as const,
  // Under progress(projectId), so invalidating a project's progress refreshes this one too.
  progressWithManifests: (projectId: string | number | undefined) => [...projectKeys.progress(projectId), 'manifests'] as const,
  taskDebug: (projectId: string | number | undefined) => [...projectKeys.all, 'task-debug', String(projectId)] as const,
  manuals: () => [...projectKeys.all, 'manual'] as const,
  manual: (projectSlug: string | undefined) => [...projectKeys.manuals(), projectSlug] as const,
  formLayouts: () => [...projectKeys.all, 'form-layout'] as const,
  formLayout: (projectSlug: string | undefined) => [...projectKeys.formLayouts(), projectSlug] as const,
  institution: (projectSlug: string | undefined) => [...projectKeys.all, 'institution', projectSlug] as const,
  institutionLinks: () => [...projectKeys.all, 'institution-links'] as const,
  prepareClaim: (projectId: string | number | undefined, manifestId: number | undefined) =>
    ['prepare-claim', String(projectId), manifestId] as const,
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

  progressWithManifests: (projectId: string | number | undefined) =>
    queryOptions({
      queryKey: projectKeys.progressWithManifests(projectId),
      queryFn: ({ signal }) => projectsApi.getProgressWithManifests(projectId!, signal),
      enabled: !!projectId,
    }),

  taskDebug: (projectId: string | number | undefined) =>
    queryOptions({ queryKey: projectKeys.taskDebug(projectId), queryFn: () => projectsApi.getTaskDebug(projectId!), enabled: !!projectId }),

  manual: (projectSlug: string | undefined) =>
    queryOptions({ queryKey: projectKeys.manual(projectSlug), queryFn: () => projectsApi.getManual(projectSlug!), enabled: !!projectSlug }),

  // A project without a layout answers 404, so data stays undefined and the form follows the model.
  formLayout: (projectSlug: string | undefined) =>
    queryOptions({
      queryKey: projectKeys.formLayout(projectSlug),
      queryFn: () => projectsApi.getFormLayout(projectSlug!),
      enabled: !!projectSlug,
    }),

  institution: (projectSlug: string | undefined) =>
    queryOptions({
      queryKey: projectKeys.institution(projectSlug),
      queryFn: () => projectsApi.getInstitution(projectSlug!),
      enabled: !!projectSlug,
    }),

  institutionLinks: () => queryOptions({ queryKey: projectKeys.institutionLinks(), queryFn: () => projectsApi.listInstitutionLinks() }),

  // A POST used as a read: makes sure the capture model for this claim exists and returns its id.
  // The answer decides the claim (use-task-claim) and whether the form starts blank
  // (use-annotation-document). A refetch with a changed answer, e.g. on returning to the browser
  // tab, released and reclaimed the task and emptied the form while the volunteer was typing. So it
  // never refetches on its own (staleTime Infinity), and it is dropped from the cache as soon as the
  // task is left (gcTime 0), so coming back to the same manifest still asks Madoc afresh. Its key is
  // outside projectKeys.all on purpose: invalidating all projects refetches active queries whatever
  // their staleTime, and would do the same harm.
  prepareClaim: (projectId: string | number | undefined, manifestId: number | undefined) =>
    queryOptions({
      queryKey: projectKeys.prepareClaim(projectId, manifestId),
      queryFn: () => projectsApi.prepareClaim(projectId!, { manifestId }),
      enabled: !!projectId && !!manifestId,
      staleTime: Infinity,
      gcTime: 0,
    }),
};
