import { appConfig } from '../config.js';
import { getServiceJwt } from './client.js';

export async function getMadocTaskStats(
  siteId: number,
  taskId: string
): Promise<{ statuses: Record<string, number>; total: number }> {
  const query = new URLSearchParams({ type: 'crowdsourcing-task', root: 'true', distinct_subjects: 'true' });
  const response = await fetch(`${appConfig.madocGatewayUrl}/api/tasks/${taskId}/stats?${query}`, {
    headers: {
      Authorization: `Bearer ${getServiceJwt()}`,
      'x-madoc-site-id': String(siteId),
    },
  });

  if (!response.ok) {
    throw new Error(`Madoc task stats request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getMadocTasksBySubjectAndType(
  siteId: number,
  subject: string,
  type: string
): Promise<{ tasks: Array<{ id: string }> }> {
  const query = new URLSearchParams({ subject, type, all_tasks: 'true' });
  const response = await fetch(`${appConfig.madocGatewayUrl}/api/tasks?${query}`, {
    headers: {
      Authorization: `Bearer ${getServiceJwt()}`,
      'x-madoc-site-id': String(siteId),
    },
  });

  if (!response.ok) {
    throw new Error(`Madoc tasks-by-subject request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getMadocTaskDetail(siteId: number, taskId: string): Promise<{
  id: string;
  status: number;
  assignee?: { id: string; name?: string };
  state?: { maxContributors?: number; revisionId?: string };
  // The container task's own `metadata` is always empty — only its subtasks (the individual
  // claims) carry the resolved project/manifest metadata, which is why getStuckManifestCounters
  // borrows it from here instead.
  subtasks?: Array<{
    type: string;
    status: number;
    metadata?: { project?: { id: number; slug: string; label?: unknown } };
  }>;
}> {
  const query = new URLSearchParams({ all: 'true', detail: 'true' });
  const response = await fetch(`${appConfig.madocGatewayUrl}/api/tasks/${taskId}?${query}`, {
    headers: {
      Authorization: `Bearer ${getServiceJwt()}`,
      'x-madoc-site-id': String(siteId),
    },
  });

  if (!response.ok) {
    throw new Error(`Madoc task detail request failed with status ${response.status}`);
  }

  return response.json();
}

export async function updateMadocTask(siteId: number, taskId: string, body: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${appConfig.madocGatewayUrl}/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${getServiceJwt()}`,
      'x-madoc-site-id': String(siteId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Madoc task update failed with status ${response.status}`);
  }
}

export type ProjectDebugTask = {
  id: string;
  status: number;
  status_text?: string;
  subject: string;
  subject_parent?: string;
  modified_at: number;
  assignee?: { id: string; name?: string };
  metadata?: {
    subject?: { id: number; type: string; label?: unknown; thumbnail?: string };
  };
};

// All crowdsourcing-task subtasks of a project (same root_task_id + type as the /progress
// calculation in project-progress.routes.ts) -- for the admin debug page that makes the
// per-manifest transcribed percentage verifiable.
export async function getMadocProjectTasks(siteId: number, rootTaskId: string): Promise<ProjectDebugTask[]> {
  const perPage = 100;
  const tasks: ProjectDebugTask[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const query = new URLSearchParams({
      root_task_id: rootTaskId,
      type: 'crowdsourcing-task',
      all_tasks: 'true',
      detail: 'true',
      per_page: String(perPage),
      page: String(page),
    });
    const response = await fetch(`${appConfig.madocGatewayUrl}/api/tasks?${query}`, {
      headers: {
        Authorization: `Bearer ${getServiceJwt()}`,
        'x-madoc-site-id': String(siteId),
      },
    });

    if (!response.ok) {
      throw new Error(`Madoc project-tasks request failed with status ${response.status}`);
    }

    const data = (await response.json()) as { tasks: ProjectDebugTask[]; pagination?: { totalPages?: number } };
    tasks.push(...data.tasks);
    totalPages = data.pagination?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return tasks;
}
