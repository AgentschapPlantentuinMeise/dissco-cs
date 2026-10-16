import { serviceJson } from './client.js';
import { collectAllPages } from './pagination.js';
import { madocPath } from './path-segment.js';
import { MadocProjectDto, MadocProjectListPageDto } from '@dissco-cs/shared-types';

/**
 * One project, whatever its status. Uses the service token.
 * @param siteId the site
 * @param projectId Madoc project id or slug
 * Returns: MadocProjectDto. Throws a MadocHttpError (e.g. 404) when the project is not on this site.
 */
export function getMadocProject(siteId: number, projectId: string): Promise<MadocProjectDto> {
  return serviceJson(madocPath`/api/madoc/projects/${projectId}`, { siteId });
}

/**
 * The project a task belongs to, found through its root task. Needed for review tasks: unlike a
 * volunteer's task, Madoc does not fill in task.metadata.project for them. Uses the service token.
 * @param siteId the site
 * @param rootTaskId the task's root_task (= the project's task_id)
 * Returns: the project, or null when none matches.
 */
export async function getMadocProjectByRootTaskId(siteId: number, rootTaskId: string): Promise<MadocProjectDto | null> {
  const data = await serviceJson<{ projects: MadocProjectDto[] }>('/api/madoc/projects', {
    siteId,
    query: { root_task_id: rootTaskId },
  });
  return data.projects[0] ?? null;
}

/**
 * Every project of the site, whatever its status (also unpublished and finished ones). Madoc's
 * list only gives every status to a caller with the site.admin scope who sends no `published`
 * filter -- which is the case here, with the service token.
 * @param siteId the site
 * Returns: MadocProjectDto[], all pages together.
 */
export function listAllMadocProjects(siteId: number): Promise<MadocProjectDto[]> {
  return collectAllPages(async page => {
    const data = await serviceJson<MadocProjectListPageDto>('/api/madoc/projects', {
      siteId,
      query: { page: String(page) },
    });
    return { items: data.projects, totalPages: data.pagination?.totalPages };
  });
}
