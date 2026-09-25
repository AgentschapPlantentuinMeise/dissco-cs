import queryString from 'query-string';
import { request } from './request';
import { MadocPagination } from '@dissco-cs/shared-types';

// -- Generic tasks-api reads/writes (/api/tasks, gateway auth_request) --
export const getTasks = <T = unknown>(page?: number, query: Record<string, unknown> = {}) =>
  request<{ tasks: T[]; pagination?: MadocPagination }>(
    `/api/tasks?${queryString.stringify({ page: page || 1, ...query }, { arrayFormat: 'comma' })}`
  );

export const updateTask = (id: string, task: Record<string, unknown>) =>
  request<void>(`/api/tasks/${id}`, { method: 'PATCH', body: task });

export const getTaskById = (id: string) =>
  request<{ id: string; status: number; state?: { revisionId?: string } }>(
    `/api/tasks/${id}?${queryString.stringify({ all: 'true', detail: 'true' })}`
  );
