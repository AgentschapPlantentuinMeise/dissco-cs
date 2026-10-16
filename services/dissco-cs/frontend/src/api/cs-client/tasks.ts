import queryString from 'query-string';
import { csFetch } from './request';
import { MadocCrowdsourcingTaskDto, MadocPagination } from '@dissco-cs/shared-types';

export const tasksApi = {
  /**
   * One page of Madoc's task list, asked as the caller: a volunteer only gets their own tasks.
   * @param page page number, from 1 (default 1)
   * @param query extra Madoc /api/tasks filters (e.g. type, status, all_tasks), passed on unchecked
   * Who: logged-in user.
   * Returns: { tasks, pagination } as Madoc sends it; Madoc's status passed through unchanged.
   */
  list: <T = unknown>(page?: number, query: Record<string, unknown> = {}) =>
    csFetch<{ tasks: T[]; pagination?: MadocPagination }>(
      `/tasks?${queryString.stringify({ page: page || 1, ...query }, { arrayFormat: 'comma' })}`
    ),

  /**
   * Same as list, but every page at once (the backend walks Madoc's pages).
   * @param query extra Madoc /api/tasks filters, passed on unchecked
   * Who: logged-in user.
   * Returns: the tasks, all pages together.
   */
  listAll: async <T = unknown>(query: Record<string, unknown> = {}) =>
    (await csFetch<{ tasks: T[] }>(`/tasks?${queryString.stringify({ ...query, all: true }, { arrayFormat: 'comma' })}`))
      .tasks,

  /**
   * One task with its details, asked as the caller.
   * @param taskId Madoc task id
   * Who: logged-in user who may see the task (Madoc decides).
   * Returns: the task; Madoc's status passed through unchanged.
   */
  get: (taskId: string) => csFetch<{ id: string; status: number; state?: { revisionId?: string } }>(`/tasks/${taskId}`),

  /**
   * Changes a task through Madoc's generic tasks API, as the caller.
   * @param taskId Madoc task id
   * @param task the fields to change, passed on unchecked: { status, status_text } -- status 1 in
   *   progress, 2 submitted, -1 abandoned
   * Who: the task's assignee (Madoc decides).
   * Returns: nothing; Madoc's status passed through unchanged.
   */
  update: (taskId: string, task: Record<string, unknown>) =>
    csFetch<void>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(task) }),

  /**
   * Tasks that block a manifest for other volunteers: claimed but never started (status 0), or in
   * progress (status 1) without activity for a while. Plus manifests stuck on "max contributors"
   * while none of their claims is still active.
   * Input: none.
   * Who: site admin.
   * Returns: { tasks, manifestCounters }.
   */
  listStuck: () => csFetch<{ tasks: MadocCrowdsourcingTaskDto[]; manifestCounters: MadocCrowdsourcingTaskDto[] }>('/tasks/stuck'),

  /**
   * Releases a stuck task: sets it to abandoned (-1), so the manifest is free again.
   * @param taskId Madoc task id (from listStuck().tasks)
   * Who: site admin.
   * Returns: { released: true }.
   */
  release: (taskId: string) => csFetch<{ released: boolean }>(`/tasks/${taskId}/release`, { method: 'POST' }),

  /**
   * Recounts a manifest's contributors and reopens it (status 1) when there is room again --
   * Madoc only recounts on a new claim, never on a release.
   * @param containerId the manifest task's id (from listStuck().manifestCounters)
   * Who: site admin.
   * Returns: { resynced } -- false when nothing had to change.
   */
  resyncManifest: (containerId: string) =>
    csFetch<{ resynced: boolean }>(`/tasks/manifests/${containerId}/resync`, { method: 'POST' }),
};
