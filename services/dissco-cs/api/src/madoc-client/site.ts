import { appConfig } from '../config.js';
import { getServiceJwt } from './client.js';

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
