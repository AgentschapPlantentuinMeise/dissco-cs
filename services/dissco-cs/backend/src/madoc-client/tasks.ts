import { serviceJson } from './client.js';
import { collectAllPages } from './pagination.js';
import { madocPath } from './path-segment.js';
import { listAllMadocProjects } from './projects.js';
import { shouldReopenManifest } from './tasks.logic.js';
import { MadocCrowdsourcingTaskDto, MadocInternationalString, MadocPagination } from '@dissco-cs/shared-types';

/**
 * Every page of a query on Madoc's task list, one page after the other (100 tasks per page).
 * Uses the service token.
 * @param siteId the site
 * @param query Madoc's /api/tasks filters, e.g. { type, status: '0,1', root_task_id }
 * Returns: the tasks of all pages.
 */
export function fetchAllTasks<T = MadocCrowdsourcingTaskDto>(siteId: number, query: Record<string, string>): Promise<T[]> {
  return collectAllPages(async page => {
    const data = await serviceJson<{ tasks: T[]; pagination?: MadocPagination }>('/api/tasks', {
      siteId,
      query: { ...query, per_page: '100', page: String(page) },
    });
    return { items: data.tasks, totalPages: data.pagination?.totalPages };
  });
}

/**
 * The tasks of one type about one subject, e.g. the manifest task of a manifest. Uses the
 * service token.
 * @param subject the subject's urn, e.g. 'urn:madoc:manifest:12'
 * @param type the task type, e.g. 'crowdsourcing-manifest-task'
 * Returns: { tasks } with their ids.
 */
export function getMadocTasksBySubjectAndType(
  siteId: number,
  subject: string,
  type: string
): Promise<{ tasks: Array<{ id: string }> }> {
  return serviceJson('/api/tasks', { siteId, query: { subject, type, all_tasks: 'true' } });
}

/**
 * One task with its state and subtasks. Uses the service token.
 * @param taskId Madoc task id
 * Returns: the task. Throws a MadocHttpError when Madoc answers with an error.
 */
export function getMadocTaskDetail(siteId: number, taskId: string): Promise<{
  id: string;
  status: number;
  assignee?: { id: string; name?: string };
  state?: { maxContributors?: number; revisionId?: string };
  // A manifest task's own metadata is always empty; only its subtasks (the claims) carry the
  // project, which is why getStuckManifestCounters reads it from here.
  subtasks?: Array<{
    type: string;
    status: number;
    metadata?: { project?: { id: number; slug: string; label?: unknown } };
  }>;
}> {
  return serviceJson(madocPath`/api/tasks/${taskId}`, { siteId, query: { all: 'true', detail: 'true' } });
}

/**
 * Changes a task with the service token -- for this backend's own fixes (releasing a stuck
 * task, reopening a manifest), never for something a user does.
 * @param taskId Madoc task id
 * @param body the fields to change, e.g. { status: -1, status_text: 'abandoned' }
 * Returns: nothing. Throws a MadocHttpError when Madoc answers with an error.
 */
export async function updateMadocTask(siteId: number, taskId: string, body: Record<string, unknown>): Promise<void> {
  await serviceJson(madocPath`/api/tasks/${taskId}`, { siteId, method: 'PATCH', body });
}

/**
 * Every volunteer task (crowdsourcing-task) of a project, with details -- the same tasks the
 * progress percentage counts. Uses the service token.
 * @param rootTaskId the project's root task (MadocProjectDto.task_id)
 * Returns: MadocCrowdsourcingTaskDto[].
 */
export function getMadocProjectTasks(siteId: number, rootTaskId: string): Promise<MadocCrowdsourcingTaskDto[]> {
  return fetchAllTasks(siteId, {
    root_task_id: rootTaskId,
    type: 'crowdsourcing-task',
    all_tasks: 'true',
    detail: 'true',
  });
}

/**
 * Reopens a full manifest when there is room again. Madoc only recounts how many volunteers work
 * on a manifest when someone claims it, not when someone lets it go, so a manifest can stay
 * marked full (status 2) after all its claims were abandoned. This sets it back to status 1
 * ('accepting contributions') when fewer claims than its maximum are still active.
 * @param containerTaskId the manifest task's id (type crowdsourcing-manifest-task)
 * Returns: true when it was reopened; false when nothing had to change (no maximum set, already
 *   open, done or rejected, or still full).
 */
export async function resyncManifestTaskCounter(siteId: number, containerTaskId: string): Promise<boolean> {
  const detail = await getMadocTaskDetail(siteId, containerTaskId);
  if (!shouldReopenManifest(detail)) {
    return false;
  }

  await updateMadocTask(siteId, containerTaskId, { status: 1, status_text: 'accepting contributions' });
  return true;
}

// Always filtered on one project (root_task_id): a query on every crowdsourcing-task of the site
// makes Madoc scan the whole task table, which gets slower as tasks pile up. Per project it is
// a fast, indexed lookup.
function fetchCrowdsourcingTasksByStatus(
  siteId: number,
  status: 0 | 1,
  rootTaskId: string,
  modifiedBefore?: Date
): Promise<MadocCrowdsourcingTaskDto[]> {
  const query: Record<string, string> = {
    type: 'crowdsourcing-task',
    all_tasks: 'true',
    root_task_id: rootTaskId,
    status: String(status),
    detail: 'true',
  };
  if (modifiedBefore) {
    query.modified_date_end = modifiedBefore.toISOString();
  }
  return fetchAllTasks(siteId, query);
}

const STUCK_IN_PROGRESS_AFTER_DAYS = 14;

/**
 * Volunteer tasks that block their manifest for others: claimed but never started (status 0),
 * or in progress (status 1) without any change for STUCK_IN_PROGRESS_AFTER_DAYS (14) days.
 * Normal ongoing work is not listed. Asked per project. Uses the service token.
 * @param siteId the site
 * Returns: MadocCrowdsourcingTaskDto[].
 */
export async function getStuckMadocTasks(siteId: number): Promise<MadocCrowdsourcingTaskDto[]> {
  const staleCutoff = new Date(Date.now() - STUCK_IN_PROGRESS_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const projects = await listAllMadocProjects(siteId);

  const perProject = await Promise.all(
    projects.map(async project => {
      const [notStarted, staleInProgress] = await Promise.all([
        fetchCrowdsourcingTasksByStatus(siteId, 0, project.task_id),
        fetchCrowdsourcingTasksByStatus(siteId, 1, project.task_id, staleCutoff),
      ]);
      return [...notStarted, ...staleInProgress];
    })
  );

  return perProject.flat();
}

/**
 * Manifests marked full (status 2) while fewer claims than their maximum are still active --
 * no task to release, only a count that is out of date. resyncManifestTaskCounter fixes one;
 * nothing does that automatically. Uses the service token.
 * @param siteId the site
 * Returns: the manifest tasks, with maxContributors, validCount and their project.
 */
export async function getStuckManifestCounters(siteId: number): Promise<MadocCrowdsourcingTaskDto[]> {
  const containers = await fetchAllTasks<{ id: string; name?: string; subject: string; modified_at: number }>(siteId, {
    type: 'crowdsourcing-manifest-task',
    all_tasks: 'true',
    status: '2',
    detail: 'true',
  });

  const results: MadocCrowdsourcingTaskDto[] = [];
  for (const container of containers) {
    const detail = await getMadocTaskDetail(siteId, container.id);
    const maximum = detail.state?.maxContributors ? Number(detail.state.maxContributors) : undefined;
    if (!maximum) continue;

    const subtasks = detail.subtasks ?? [];
    const validCount = subtasks.filter(t => t.type === 'crowdsourcing-task' && t.status !== -1).length;
    if (validCount < maximum) {
      // The manifest task's own metadata is empty; take the project from one of its claims.
      const project = subtasks.find(t => t.metadata?.project)?.metadata?.project;
      results.push({
        id: container.id,
        name: container.name,
        subject: container.subject,
        modified_at: container.modified_at,
        // The query above only asks for status 2.
        status: 2,
        maxContributors: maximum,
        validCount,
        metadata: project ? { project: project as { id: number; slug: string; label?: MadocInternationalString | string } } : undefined,
      });
    }
  }

  return results;
}
