import queryString from 'query-string';
import { csFetch } from './request';
import { MadocCrowdsourcingTaskDto, MadocPagination } from '@dissco-cs/shared-types';

export const tasksApi = {
  // The calling user's own tasks (the backend forwards as that user).
  list: <T = unknown>(page?: number, query: Record<string, unknown> = {}) =>
    csFetch<{ tasks: T[]; pagination?: MadocPagination }>(
      `/tasks?${queryString.stringify({ page: page || 1, ...query }, { arrayFormat: 'comma' })}`
    ),

  get: (taskId: string) => csFetch<{ id: string; status: number; state?: { revisionId?: string } }>(`/tasks/${taskId}`),

  update: (taskId: string, task: Record<string, unknown>) =>
    csFetch<void>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(task) }),

  // ---- admin: stuck tasks ----

  listStuck: () => csFetch<{ tasks: MadocCrowdsourcingTaskDto[]; manifestCounters: MadocCrowdsourcingTaskDto[] }>('/tasks/stuck'),

  release: (taskId: string) => csFetch<{ released: boolean }>(`/tasks/${taskId}/release`, { method: 'POST' }),

  resyncManifest: (containerId: string) =>
    csFetch<{ resynced: boolean }>(`/tasks/manifests/${containerId}/resync`, { method: 'POST' }),
};
