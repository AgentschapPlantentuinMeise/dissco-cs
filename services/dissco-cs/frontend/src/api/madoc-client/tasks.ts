import queryString from 'query-string';
import { request } from './request';

// -- Generic tasks-api reads/writes (/api/tasks, gateway auth_request) --
export const getTasks = <T = any>(page?: number, query: Record<string, unknown> = {}) =>
  request<{ tasks: T[]; pagination: any }>(
    `/api/tasks?${queryString.stringify({ page: page || 1, ...query }, { arrayFormat: 'comma' })}`
  );

export const updateTask = (id: string, task: Record<string, unknown>) =>
  request<any>(`/api/tasks/${id}`, { method: 'PATCH', body: task });

export const getTaskById = (id: string) =>
  request<{ id: string; status: number; state?: { revisionId?: string } }>(
    `/api/tasks/${id}?${queryString.stringify({ all: 'true', detail: 'true' })}`
  );
