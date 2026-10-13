import { serviceJson } from './client.js';
import { collectAllPages } from './pagination.js';
import { madocPath } from './path-segment.js';
import { MadocProjectDto, MadocProjectListPageDto } from '@dissco-cs/shared-types';

export function getMadocProject(siteId: number, projectId: string): Promise<MadocProjectDto> {
  return serviceJson(madocPath`/api/madoc/projects/${projectId}`, { siteId });
}

// task.metadata.project turns out to be empty for crowdsourcing-review tasks (unlike
// crowdsourcing-task), so the project is looked up via root_task_id instead -- the same
// filter list-projects.ts already supports server-side.
export async function getMadocProjectByRootTaskId(siteId: number, rootTaskId: string): Promise<MadocProjectDto | null> {
  const data = await serviceJson<{ projects: MadocProjectDto[] }>('/api/madoc/projects', {
    siteId,
    query: { root_task_id: rootTaskId },
  });
  return data.projects[0] ?? null;
}

// All projects on the site regardless of status (including unpublished/finished ones) -- the
// public listProjects route in madoc-ts only shows status 1/2 unless the caller has site.admin
// scope AND sends no `published` query param (see listProjects.ts), which is the case here
// thanks to the service JWT.
export function listAllMadocProjects(siteId: number): Promise<MadocProjectDto[]> {
  return collectAllPages(async page => {
    const data = await serviceJson<MadocProjectListPageDto>('/api/madoc/projects', {
      siteId,
      query: { page: String(page) },
    });
    return { items: data.projects, totalPages: data.pagination?.totalPages };
  });
}
