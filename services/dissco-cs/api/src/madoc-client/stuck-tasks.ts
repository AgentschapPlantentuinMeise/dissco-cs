import { appConfig } from '../config.js';
import { getServiceJwt } from './client.js';
import { getMadocTaskDetail, updateMadocTask } from './tasks.js';

// Madoc-ts only re-computes a manifest-task's shared max-contributors counter when a NEW claim
// is created, never when an existing one is abandoned/released — so a manifest can stay stuck
// on status 2 ("max contributors") forever even once every underlying claim is -1. Shared by
// the resync-claim route (looked up by subject) and the stuck-tasks admin list (looked up by
// container task id directly).
export async function resyncManifestTaskCounter(siteId: number, containerTaskId: string): Promise<boolean> {
  const detail = await getMadocTaskDetail(siteId, containerTaskId);

  const maximum = detail.state?.maxContributors ? Number(detail.state.maxContributors) : undefined;
  if (!maximum || detail.status === 3 || detail.status === -1 || detail.status === 1) {
    return false;
  }

  const validCount = (detail.subtasks ?? []).filter(t => t.type === 'crowdsourcing-task' && t.status !== -1).length;
  if (validCount >= maximum) {
    return false;
  }

  await updateMadocTask(siteId, containerTaskId, { status: 1, status_text: 'accepting contributions' });
  return true;
}

export type StuckTask = {
  id: string;
  status: number;
  status_text?: string;
  subject: string;
  modified_at: number;
  assignee?: { id: string; name?: string };
  metadata?: {
    project?: { id: number; slug: string; label?: unknown };
    subject?: { id: number; type: string; label?: unknown; thumbnail?: string };
  };
};

// Site-wide crowdsourcing tasks that are claimed (status 0) or in progress (status 1) but
// never finished or released — these silently block their manifest for everyone else (see
// AnnotatePage/manifest-claims discussion) with no other way to find them than this list.
export async function getStuckMadocTasks(siteId: number): Promise<StuckTask[]> {
  const perPage = 100;
  const tasks: StuckTask[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const query = new URLSearchParams({
      type: 'crowdsourcing-task',
      all_tasks: 'true',
      status: '0,1',
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
      throw new Error(`Madoc stuck-tasks request failed with status ${response.status}`);
    }

    const data = (await response.json()) as { tasks: StuckTask[]; pagination?: { totalPages?: number } };
    tasks.push(...data.tasks);
    totalPages = data.pagination?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return tasks;
}

export type StuckManifestCounter = {
  id: string;
  name?: string;
  subject: string;
  modified_at: number;
  maxContributors: number;
  validCount: number;
  metadata?: {
    project?: { id: number; slug: string; label?: unknown };
  };
};

// Site-wide manifest-tasks stuck on status 2 ("max contributors") whose underlying claims are
// ALL already resolved (-1/abandoned) — no single task to release, just a stale counter that
// resyncManifestTaskCounter() would fix, but nothing ever triggers that automatically.
export async function getStuckManifestCounters(siteId: number): Promise<StuckManifestCounter[]> {
  const perPage = 100;
  const containers: Array<{ id: string; name?: string; subject: string; modified_at: number }> = [];
  let page = 1;
  let totalPages = 1;

  do {
    const query = new URLSearchParams({
      type: 'crowdsourcing-manifest-task',
      all_tasks: 'true',
      status: '2',
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
      throw new Error(`Madoc stuck-manifest-counters request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      tasks: Array<{ id: string; name?: string; subject: string; modified_at: number }>;
      pagination?: { totalPages?: number };
    };
    containers.push(...data.tasks);
    totalPages = data.pagination?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  const results: StuckManifestCounter[] = [];
  for (const container of containers) {
    const detail = await getMadocTaskDetail(siteId, container.id);
    const maximum = detail.state?.maxContributors ? Number(detail.state.maxContributors) : undefined;
    if (!maximum) continue;

    const subtasks = detail.subtasks ?? [];
    const validCount = subtasks.filter(t => t.type === 'crowdsourcing-task' && t.status !== -1).length;
    if (validCount < maximum) {
      // The container's own metadata is always empty — only its subtasks (the individual
      // claims) carry the resolved project metadata, so borrow it from whichever one has it.
      const project = subtasks.find(t => t.metadata?.project)?.metadata?.project;
      results.push({
        id: container.id,
        name: container.name,
        subject: container.subject,
        modified_at: container.modified_at,
        maxContributors: maximum,
        validCount,
        metadata: project ? { project } : undefined,
      });
    }
  }

  return results;
}
