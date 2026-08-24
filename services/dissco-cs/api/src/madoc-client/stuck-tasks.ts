import { appConfig } from '../config.js';
import { getServiceJwt } from './client.js';
import { listAllMadocProjects } from './projects.js';
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

// Unscoped (no root_task_id), all_tasks=true queries on type=crowdsourcing-task force a full
// table scan that gets dramatically slower as the site accumulates tasks over time — scoping by
// root_task_id (like getMadocProjectTasks already does for the task-debug tab) turns each call
// back into an indexed, near-instant lookup.
async function fetchCrowdsourcingTasksByStatus(
  siteId: number,
  status: 0 | 1,
  rootTaskId: string,
  modifiedBefore?: Date
): Promise<StuckTask[]> {
  const perPage = 100;
  const tasks: StuckTask[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const query = new URLSearchParams({
      type: 'crowdsourcing-task',
      all_tasks: 'true',
      root_task_id: rootTaskId,
      status: String(status),
      detail: 'true',
      per_page: String(perPage),
      page: String(page),
    });
    if (modifiedBefore) {
      query.set('modified_date_end', modifiedBefore.toISOString());
    }
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

const STUCK_IN_PROGRESS_AFTER_DAYS = 14;

// Crowdsourcing tasks, per project, that block their manifest for the rest of the team (see
// AnnotatePage/manifest-claims discussion). A claimed-but-never-started task (status 0) is
// stuck the moment it exists — nothing is going to make it move on its own. An in-progress
// task (status 1) is only stuck once it's gone stale for a while; otherwise this would just
// list every bit of normal, ongoing work.
export async function getStuckMadocTasks(siteId: number): Promise<StuckTask[]> {
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
