import { csFetch } from './request';
import { getSiteSlug } from '../slug';
import {
  InstitutionDto,
  ManualDetailDto,
  MadocCreateResourceClaimDto,
  MadocPrepareClaimDto,
  MadocProjectDto,
  MadocProjectListPageDto,
  MadocRandomManifestDto,
  ProjectDebugDto,
  ProjectProgressDto,
  SitePageLang,
} from '@dissco-cs/shared-types';

type ProjectListQuery = { published?: boolean };

function listQuery(query: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams({ slug: getSiteSlug() });
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

export const projectsApi = {
  // `published: true` gives the same "active" set an anonymous visitor sees -- for a site admin
  // Madoc otherwise returns every project regardless of status.
  list: (query: ProjectListQuery & { page?: number } = {}) =>
    csFetch<MadocProjectListPageDto>(`/projects?${listQuery({ page: query.page ?? 1, published: query.published })}`),

  // Every page at once (the backend walks Madoc's pagination).
  listAll: async (query: ProjectListQuery = {}) =>
    (await csFetch<{ projects: MadocProjectDto[] }>(`/projects?${listQuery({ all: true, published: query.published })}`)).projects,

  get: (projectId: string | number) => csFetch<MadocProjectDto>(`/projects/${projectId}?slug=${getSiteSlug()}`),

  // Admin, bulk create: Madoc's own project creation (collection + capture model + root task).
  create: (body: {
    label: Record<string, string[]>;
    summary: Record<string, string[]>;
    slug: string;
    template?: 'remote';
    remote_template?: unknown;
    duplicate_project_id?: number;
  }) => csFetch<MadocProjectDto>('/projects', { method: 'POST', body: JSON.stringify(body) }),

  // The project's capture model (+ config) as a reusable template, for `remote_template`.
  exportTemplate: (projectId: string | number) => csFetch<unknown>(`/projects/${projectId}/export`),

  // The project's own flat collection id, to link manifests/collections to it.
  getStructure: (projectId: string | number) => csFetch<{ collectionId: number }>(`/projects/${projectId}/structure`),

  // 0 paused, 1 active, 2 published/complete, 3 archived, 4 prepared.
  setStatus: (projectId: string | number, status: number) =>
    csFetch<void>(`/projects/${projectId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Volunteer: a random manifest that still needs work (without claiming it yet).
  randomManifest: (projectId: string | number, body: { collectionId?: number } = {}) =>
    csFetch<MadocRandomManifestDto>(`/projects/${projectId}/random`, {
      method: 'POST',
      body: JSON.stringify({ ...body, type: 'manifest', claim: false }),
    }),

  // Ensures the capture model for this claim's target (manifest/canvas) exists -- creating it by
  // cloning the project's base model if needed -- and returns its id. A plain model lookup only
  // finds models that were already derived, which for a manifest-level claim never happens until
  // prepare-claim or claim has run at least once.
  prepareClaim: (projectId: string | number, claim: Record<string, unknown>) =>
    csFetch<MadocPrepareClaimDto>(`/projects/${projectId}/prepare-claim`, { method: 'POST', body: JSON.stringify(claim) }),

  claim: (projectId: string | number, claim: Record<string, unknown>) =>
    csFetch<MadocCreateResourceClaimDto>(`/projects/${projectId}/claim`, { method: 'POST', body: JSON.stringify(claim) }),

  // Deletes the user's own claim task entirely (instead of setting it to status -1) -- existing
  // upstream madoc-ts route, see routes/projects/delete-resource-claim.ts.
  revokeClaim: (projectId: string | number, claim: Record<string, unknown>) =>
    csFetch<void>(`/projects/${projectId}/revoke-claim`, { method: 'POST', body: JSON.stringify(claim) }),

  getProgress: (projectId: string | number, signal?: AbortSignal) =>
    csFetch<ProjectProgressDto>(`/projects/${projectId}/progress?slug=${getSiteSlug()}`, { signal }),

  // Recalculates the shared max-contributors counter after an abandon (see AnnotatePage.tsx) --
  // best-effort, madoc-ts only syncs that counter itself when a new claim is created.
  resyncClaim: (projectId: string | number, manifestId: string | number) =>
    csFetch<{ resynced: boolean }>(`/projects/${projectId}/manifests/${manifestId}/resync-claim?slug=${getSiteSlug()}`, {
      method: 'POST',
    }),

  getTaskDebug: (projectId: string | number) => csFetch<ProjectDebugDto>(`/projects/${projectId}/task-debug`),

  getManual: (projectSlug: string) =>
    csFetch<ManualDetailDto>(`/projects/${encodeURIComponent(projectSlug)}/manual?slug=${getSiteSlug()}`),

  manualAttachmentUrl: (projectSlug: string, lang: SitePageLang) =>
    `/api/dissco-cs/projects/${encodeURIComponent(projectSlug)}/manual/attachment/${lang}?slug=${getSiteSlug()}`,

  setManualLink: (projectSlug: string, manualId: number | null) =>
    csFetch<void>(`/projects/${encodeURIComponent(projectSlug)}/manual-link`, {
      method: 'PUT',
      body: JSON.stringify({ manualId }),
    }),

  pruneManualLinks: (liveSlugs: string[]) =>
    csFetch<{ removed: number }>('/projects/manual-links/prune', {
      method: 'PUT',
      body: JSON.stringify({ liveSlugs }),
    }),

  getInstitution: (projectSlug: string) =>
    csFetch<InstitutionDto>(`/projects/${encodeURIComponent(projectSlug)}/institution?slug=${getSiteSlug()}`),

  listInstitutionLinks: () => csFetch<{ links: Record<string, number> }>('/projects/institution-links'),

  setInstitutionLink: (projectSlug: string, institutionId: number | null) =>
    csFetch<void>(`/projects/${encodeURIComponent(projectSlug)}/institution-link`, {
      method: 'PUT',
      body: JSON.stringify({ institutionId }),
    }),

  pruneInstitutionLinks: (liveSlugs: string[]) =>
    csFetch<{ removed: number }>('/projects/institution-links/prune', {
      method: 'PUT',
      body: JSON.stringify({ liveSlugs }),
    }),
};
