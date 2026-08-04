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
  state?: { maxContributors?: number };
  subtasks?: Array<{ type: string; status: number }>;
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
