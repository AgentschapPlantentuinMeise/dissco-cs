import { serviceFetch } from './client.js';
import { isSafeSegment, madocPath } from './path-segment.js';

const siteIdBySlugCache = new Map<string, number>();

export async function getSiteIdBySlug(slug: string): Promise<number | null> {
  // An unsafe slug is just an unknown site: callers already answer 400 "Could not resolve site".
  if (!isSafeSegment(slug)) {
    return null;
  }

  const cached = siteIdBySlugCache.get(slug);
  if (cached !== undefined) {
    return cached;
  }

  const response = await serviceFetch(madocPath`/s/${slug}/madoc/api/site`);

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
