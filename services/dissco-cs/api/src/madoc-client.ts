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
