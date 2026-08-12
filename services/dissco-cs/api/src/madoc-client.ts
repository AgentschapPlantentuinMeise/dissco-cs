import { readFileSync } from 'fs';

import { appConfig } from './config.js';

function getServiceJwt(): string {
  const jwtJsonString = readFileSync(appConfig.madocServiceJwtPath).toString('utf-8');
  return JSON.parse(jwtJsonString).token;
}

export async function getMadocProject(siteId: number, projectId: string): Promise<unknown> {
  const response = await fetch(`${appConfig.madocGatewayUrl}/api/madoc/projects/${projectId}`, {
    headers: {
      Authorization: `Bearer ${getServiceJwt()}`,
      'x-madoc-site-id': String(siteId),
    },
  });

  if (!response.ok) {
    throw new Error(`Madoc project request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getMadocCollectionStructure(
  siteId: number,
  collectionId: number
): Promise<{ items: unknown[] }> {
  const response = await fetch(`${appConfig.madocGatewayUrl}/api/madoc/iiif/collections/${collectionId}/structure`, {
    headers: {
      Authorization: `Bearer ${getServiceJwt()}`,
      'x-madoc-site-id': String(siteId),
    },
  });

  if (!response.ok) {
    throw new Error(`Madoc collection structure request failed with status ${response.status}`);
  }

  return response.json();
}

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

// Alle crowdsourcing-task subtaken van een project (zelfde root_task_id + type als de
// /progress-berekening in project-progress.routes.ts) -- voor de admin-debugpagina die het
// getranscribeerd-percentage per manifest verifieerbaar maakt.
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

// Site-rol van één gebruiker (bv. 'reviewer', 'trusted-user', 'admin') -- voor de
// nav-zichtbaarheidscheck, los van de per-project manuallyAssignedReviewer-toewijzing.
export async function getMadocSiteUserRole(siteId: number, userId: number): Promise<string | null> {
  const response = await fetch(`${appConfig.madocGatewayUrl}/api/madoc/manage-site/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${getServiceJwt()}`,
      'x-madoc-site-id': String(siteId),
      'x-madoc-user-id': String(userId),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Madoc site-user request failed with status ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { user?: { site_role?: string } };
  return data.user?.site_role ?? null;
}

export type ReviewTask = {
  id: string;
  status: number;
  status_text?: string;
  subject: string;
  subject_parent?: string;
  parameters?: unknown[];
  modified_at: number;
  root_task?: string;
  assignee?: { id: string; name?: string };
  metadata?: {
    project?: { id: number; slug: string; label?: unknown };
    subject?: { id: number; type: string; label?: unknown; thumbnail?: string };
  };
};

export type MadocProjectSummary = { id: number; slug: string; label?: unknown };

// task.metadata.project blijkt niet gevuld te zijn voor crowdsourcing-review-taken (in
// tegenstelling tot crowdsourcing-task), dus het project wordt via root_task_id opgezocht --
// dezelfde filter die list-projects.ts server-side al ondersteunt.
export async function getMadocProjectByRootTaskId(siteId: number, rootTaskId: string): Promise<MadocProjectSummary | null> {
  const query = new URLSearchParams({ root_task_id: rootTaskId });
  const response = await fetch(`${appConfig.madocGatewayUrl}/api/madoc/projects?${query}`, {
    headers: {
      Authorization: `Bearer ${getServiceJwt()}`,
      'x-madoc-site-id': String(siteId),
    },
  });

  if (!response.ok) {
    throw new Error(`Madoc project-by-root-task request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { projects: MadocProjectSummary[] };
  return data.projects[0] ?? null;
}

// Alle review-taken van de site die nog openstaan (-1 afgewezen, 3 geaccepteerd en 4/5
// afgehandeld tellen niet mee -- 0 niet gestart, 1 te behandelen ("todo"), 2 in review wel,
// zie Madoc's eigen REVIEW_STATUS_MAP in review-listing-page.tsx), site-breed i.p.v. per
// project: het reviewer-overzicht toont gewoon alles wat ter review staat, met de toegewezen
// reviewer als kolom.
export async function getMadocReviewTasks(siteId: number): Promise<ReviewTask[]> {
  const perPage = 100;
  const tasks: ReviewTask[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const query = new URLSearchParams({
      type: 'crowdsourcing-review',
      all_tasks: 'true',
      status: '0,1,2',
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
      throw new Error(`Madoc review-tasks request failed with status ${response.status}`);
    }

    const data = (await response.json()) as { tasks: ReviewTask[]; pagination?: { totalPages?: number } };
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

const siteIdBySlugCache = new Map<string, number>();

export async function getSiteIdBySlug(slug: string): Promise<number | null> {
  const cached = siteIdBySlugCache.get(slug);
  if (cached !== undefined) {
    return cached;
  }

  const response = await fetch(`${appConfig.madocGatewayUrl}/s/${slug}/madoc/api/site`, {
    headers: {
      Authorization: `Bearer ${getServiceJwt()}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const site = (await response.json()) as { id?: unknown };
  if (typeof site.id !== 'number') {
    return null;
  }

  siteIdBySlugCache.set(slug, site.id);
  return site.id;
}
