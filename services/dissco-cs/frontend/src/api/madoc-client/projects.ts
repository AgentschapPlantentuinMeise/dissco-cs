import { publicRequest, request } from './request';

// -- Project reads (site-scoped public API) + project creation (gated, admin) --

// `published` maps straight to Madoc's own filter (status 1 or 2) -- for a site-admin viewer
// Madoc otherwise returns every project regardless of status unless this is sent explicitly, so
// public pages (Homepage, Projects) must pass `published: true` to see the same "active" set an
// anonymous visitor sees (a non-admin visitor already always gets this filter, admin or not).
export const getSiteProjects = (query?: { page?: number; published?: boolean }) =>
  publicRequest<any>('/projects', query);

export async function getAllSiteProjects(query: { published?: boolean } = {}): Promise<any[]> {
  const first = await publicRequest<any>('/projects', { page: 1, ...query });
  const totalPages = first?.pagination?.totalPages || 1;
  const projects: any[] = first?.projects || [];

  if (totalPages <= 1) {
    return projects;
  }

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => publicRequest<any>('/projects', { page: i + 2, ...query }))
  );

  return projects.concat(...rest.map(page => page?.projects || []));
}

export const getSiteProject = (id: string | number) => publicRequest<any>(`/projects/${id}`);
export const getProject = (id: string | number) => request<any>(`/api/madoc/projects/${id}`);

// Real project-creation route (same one the "New project" / "Duplicate" admin UI uses) --
// used for admin bulk-creation so seeded projects go through Madoc's own logic (collection +
// capture model + root task all created consistently) instead of hand-rolled SQL.
export const createProject = (body: {
  label: Record<string, string[]>;
  summary: Record<string, string[]>;
  slug: string;
  template?: 'remote';
  remote_template?: unknown;
  duplicate_project_id?: number;
}) => request<any>('/api/madoc/projects', { method: 'POST', body });

// Exports a project's capture model (+ config) as a reusable template -- same payload shape
// the "Duplicate project" button passes as `remote_template` when creating a new one.
export const exportProject = (id: string | number) => request<any>(`/api/madoc/projects/${id}/export`);

// Gives the project's own flat collection id, needed to link manifests/collections to it via
// updateCollectionStructure (see madoc-client/collections.ts).
export const getProjectStructure = (id: string | number) =>
  request<{ collectionId: number }>(`/api/madoc/projects/${id}/structure`);

// Same status transition as the "Pause/Resume/Mark as complete/Archive" buttons on the admin
// project-overview page (0 paused, 1 active, 2 published/complete, 3 archived, 4 prepared).
export const updateProjectStatus = (id: string | number, status: number) =>
  request<void>(`/api/madoc/projects/${id}/status`, { method: 'PUT', body: { status } });
