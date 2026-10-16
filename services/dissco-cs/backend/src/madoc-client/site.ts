import { serviceFetch } from './client.js';
import { isSafeSegment, madocPath } from './path-segment.js';

const siteIdBySlugCache = new Map<string, number>();

/**
 * The id of the site with this slug. Asked to Madoc once per slug, then kept in memory until the
 * backend restarts. Uses the service token.
 * @param slug the site's slug, e.g. from the `slug` query parameter
 * Returns: the site id, or null when the slug is not safe or Madoc does not know it.
 */
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
