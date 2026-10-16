import { csFetch, csFetchField } from './request';
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
// Madoc's structure answer, passed through; we only read the id of the project's own collection.
type MadocProjectStructure = { collectionId: number };

function listQuery(query: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams({ slug: getSiteSlug() });
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

export const projectsApi = {
  // ---- projects (Madoc, asked as the caller) ----

  /**
   * One page of the site's projects from Madoc's public site API.
   * @param query page (from 1, default 1); published: true for only active and completed projects
   *   (status 1 or 2) -- without it Madoc gives a site admin every project, whatever its status
   * Who: anyone; Madoc decides what an anonymous visitor may see.
   * Returns: MadocProjectListPageDto (projects + pagination); Madoc's status passed through.
   */
  list: (query: ProjectListQuery & { page?: number } = {}) =>
    csFetch<MadocProjectListPageDto>(`/projects?${listQuery({ page: query.page ?? 1, published: query.published })}`),

  /**
   * Same as list, but every page at once (the backend walks Madoc's pages).
   * @param query published, as in list
   * Who: anyone.
   * Returns: MadocProjectDto[].
   */
  listAll: (query: ProjectListQuery = {}) =>
    csFetchField<MadocProjectDto[]>(`/projects?${listQuery({ all: true, published: query.published })}`, 'projects'),

  /**
   * One project from Madoc's public site API.
   * @param projectId Madoc project id or slug
   * Who: anyone; Madoc decides what an anonymous visitor may see.
   * Returns: MadocProjectDto; Madoc's status passed through unchanged.
   */
  get: (projectId: string | number) => csFetch<MadocProjectDto>(`/projects/${projectId}?slug=${getSiteSlug()}`),

  /**
   * Creates a project through Madoc's own project creation (collection, capture model and root
   * task), the same route as Madoc's "New project" and "Duplicate" buttons.
   * @param body label and summary per language ({ en: ['…'] }); slug, unique on the site; to copy
   *   another project's form: template 'remote' with remote_template from exportTemplate. Passed on
   *   to Madoc unchecked.
   * Who: site admin (checked again by Madoc on the caller's own token).
   * Returns: the new MadocProjectDto; Madoc's status passed through unchanged.
   */
  create: (body: {
    label: Record<string, string[]>;
    summary: Record<string, string[]>;
    slug: string;
    template?: 'remote';
    remote_template?: unknown;
    duplicate_project_id?: number;
  }) => csFetch<MadocProjectDto>('/projects', { method: 'POST', body: JSON.stringify(body) }),

  /**
   * A project's capture model and settings as a template, to pass as remote_template to create.
   * @param projectId Madoc project id or slug
   * Who: site admin.
   * Returns: Madoc's template, not modeled.
   */
  exportTemplate: (projectId: string | number) => csFetch<unknown>(`/projects/${projectId}/export`),

  /**
   * The project's own collection, where its manifests are linked (see iiifApi.setCollectionStructure).
   * @param projectId Madoc project id or slug
   * Who: site admin.
   * Returns: { collectionId }.
   */
  getStructure: (projectId: string | number) => csFetch<MadocProjectStructure>(`/projects/${projectId}/structure`),

  /**
   * Changes a project's status, like Madoc's pause / resume / complete / archive buttons.
   * @param projectId Madoc project id or slug
   * @param status 0 paused, 1 active, 2 published/complete, 3 archived, 4 prepared
   * Who: site admin.
   * Returns: nothing; Madoc's status passed through unchanged.
   */
  setStatus: (projectId: string | number, status: number) =>
    csFetch<void>(`/projects/${projectId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // ---- picking and claiming work (Madoc, as the volunteer) ----

  /**
   * A random manifest of the project that still needs work, without claiming it yet.
   * @param projectId Madoc project id or slug
   * @param body optional collectionId to pick from one collection only
   * Who: logged-in user with access to the project.
   * Returns: MadocRandomManifestDto (manifest id, remaining tasks); Madoc's status passed through.
   */
  randomManifest: (projectId: string | number, body: { collectionId?: number } = {}) =>
    csFetch<MadocRandomManifestDto>(`/projects/${projectId}/random`, {
      method: 'POST',
      body: JSON.stringify({ ...body, type: 'manifest', claim: false }),
    }),

  /**
   * Makes sure the capture model for this manifest exists (Madoc copies the project's base model
   * the first time) and says whether the caller already has a claim on it. Call before claim: a
   * plain model lookup does not find a model that was never derived.
   * @param projectId Madoc project id
   * @param claim { manifestId }, passed on to Madoc unchecked
   * Who: logged-in user with access to the project.
   * Returns: MadocPrepareClaimDto (model id, existing claim); 404 when the caller has no access to
   *   the project (Madoc answers 404, not 403); Madoc's status passed through unchanged.
   */
  prepareClaim: (projectId: string | number, claim: Record<string, unknown>) =>
    csFetch<MadocPrepareClaimDto>(`/projects/${projectId}/prepare-claim`, { method: 'POST', body: JSON.stringify(claim) }),

  /**
   * Claims a manifest for the caller: creates their task on it.
   * @param projectId Madoc project id
   * @param claim { manifestId, status: 0, revisionId } -- revisionId is stored on the task so a
   *   later visit reuses the same draft. Passed on to Madoc unchecked.
   * Who: logged-in user with access to the project.
   * Returns: MadocCreateResourceClaimDto (the claim with its task id); Madoc's status passed
   *   through, e.g. when the manifest reached its maximum of contributors.
   */
  claim: (projectId: string | number, claim: Record<string, unknown>) =>
    csFetch<MadocCreateResourceClaimDto>(`/projects/${projectId}/claim`, { method: 'POST', body: JSON.stringify(claim) }),

  /**
   * Deletes the caller's own claim task entirely, instead of setting it to abandoned (-1).
   * Follow with resyncClaim, or the manifest may stay blocked.
   * @param projectId Madoc project id
   * @param claim { manifestId }, passed on to Madoc unchecked
   * Who: the user who holds the claim.
   * Returns: nothing; Madoc's status passed through unchanged.
   */
  revokeClaim: (projectId: string | number, claim: Record<string, unknown>) =>
    csFetch<void>(`/projects/${projectId}/revoke-claim`, { method: 'POST', body: JSON.stringify(claim) }),

  /**
   * Recounts a manifest's contributors after a claim was released, and reopens it when there is
   * room again -- Madoc only recounts on a new claim, never on a release.
   * @param projectId Madoc project id
   * @param manifestId Madoc manifest id
   * Who: logged-in user.
   * Returns: true when it was reopened; false when nothing had to change.
   */
  resyncClaim: (projectId: string | number, manifestId: string | number) =>
    csFetchField<boolean>(`/projects/${projectId}/manifests/${manifestId}/resync-claim?slug=${getSiteSlug()}`, 'resynced', {
      method: 'POST',
    }),

  // ---- progress and debug ----

  /**
   * How far a project is, the same for every visitor: the percentage of manifests in review or
   * accepted, and which manifests can still be picked (not done, contributor maximum not reached).
   * @param projectId Madoc project id or slug
   * @param signal optional, to cancel the request
   * Who: anyone.
   * Returns: ProjectProgressDto.
   */
  getProgress: (projectId: string | number, signal?: AbortSignal) =>
    csFetch<ProjectProgressDto>(`/projects/${projectId}/progress?slug=${getSiteSlug()}`, { signal }),

  /**
   * Per manifest of a project, its tasks and whether it counts as transcribed (a task with status
   * 2 or 3, the same rule as getProgress) -- to check the progress percentage by hand.
   * @param projectId Madoc project id or slug
   * Who: site admin.
   * Returns: ProjectDebugDto.
   */
  getTaskDebug: (projectId: string | number) => csFetch<ProjectDebugDto>(`/projects/${projectId}/task-debug`),

  // ---- the project's manual ----

  /**
   * The manual linked to a project: title, text and attachments per language.
   * @param projectSlug the project's slug
   * Who: anyone.
   * Returns: ManualDetailDto; 404 when the project has no manual.
   */
  getManual: (projectSlug: string) =>
    csFetch<ManualDetailDto>(`/projects/${encodeURIComponent(projectSlug)}/manual?slug=${getSiteSlug()}`),

  /**
   * Builds the download URL of the manual's attachment in one language -- no request is made.
   * @param projectSlug the project's slug
   * @param lang the language (SITE_PAGE_LANGS)
   * Returns: the URL; fetching it gives the file, or 404 when there is none.
   */
  manualAttachmentUrl: (projectSlug: string, lang: SitePageLang) =>
    `/api/dissco-cs/projects/${encodeURIComponent(projectSlug)}/manual/attachment/${lang}?slug=${getSiteSlug()}`,

  /**
   * Links a project to a manual, or unlinks it.
   * @param projectSlug the project's slug
   * @param manualId the manual (ManualSummaryDto.id), or null to unlink
   * Who: site admin.
   * Returns: nothing (204); 404 unknown manual.
   */
  setManualLink: (projectSlug: string, manualId: number | null) =>
    csFetch<void>(`/projects/${encodeURIComponent(projectSlug)}/manual-link`, {
      method: 'PUT',
      body: JSON.stringify({ manualId }),
    }),

  /**
   * Removes manual links of projects that no longer exist in Madoc.
   * @param liveSlugs the slugs of every project that still exists (from listAll)
   * Who: site admin.
   * Returns: the number of links removed.
   */
  pruneManualLinks: (liveSlugs: string[]) =>
    csFetchField<number>('/projects/manual-links/prune', 'removed', {
      method: 'POST',
      body: JSON.stringify({ liveSlugs }),
    }),

  // ---- the project's institution ----

  /**
   * The active institution a project is linked to.
   * @param projectSlug the project's slug
   * Who: anyone.
   * Returns: InstitutionDto; 404 when there is none, or it is inactive.
   */
  getInstitution: (projectSlug: string) =>
    csFetch<InstitutionDto>(`/projects/${encodeURIComponent(projectSlug)}/institution?slug=${getSiteSlug()}`),

  /**
   * Which institution every project is linked to.
   * Input: none.
   * Who: site admin.
   * Returns: project slug -> institution id.
   */
  listInstitutionLinks: () => csFetchField<Record<string, number>>('/projects/institution-links', 'links'),

  /**
   * Links a project to an institution, or unlinks it.
   * @param projectSlug the project's slug
   * @param institutionId the institution (InstitutionDto.id), or null to unlink
   * Who: site admin.
   * Returns: nothing (204); 404 unknown institution.
   */
  setInstitutionLink: (projectSlug: string, institutionId: number | null) =>
    csFetch<void>(`/projects/${encodeURIComponent(projectSlug)}/institution-link`, {
      method: 'PUT',
      body: JSON.stringify({ institutionId }),
    }),

  /**
   * Removes institution links of projects that no longer exist in Madoc.
   * @param liveSlugs the slugs of every project that still exists (from listAll)
   * Who: site admin.
   * Returns: the number of links removed.
   */
  pruneInstitutionLinks: (liveSlugs: string[]) =>
    csFetchField<number>('/projects/institution-links/prune', 'removed', {
      method: 'POST',
      body: JSON.stringify({ liveSlugs }),
    }),
};
