import { serviceJson } from './client.js';
import { madocPath } from './path-segment.js';

/**
 * A user's role on the site (e.g. 'reviewer', 'trusted-user', 'admin'). This is the site-wide
 * role, not the reviewer assigned to a single project. Uses the service token.
 * @param siteId the site
 * @param userId Madoc user id
 * Returns: the role, or null when Madoc gives none. Throws a MadocHttpError when Madoc answers
 *   with an error.
 */
export async function getMadocSiteUserRole(siteId: number, userId: number): Promise<string | null> {
  const data = await serviceJson<{ user?: { site_role?: string } }>(madocPath`/api/madoc/manage-site/users/${userId}`, {
    siteId,
    headers: { 'x-madoc-user-id': String(userId) },
  });
  return data.user?.site_role ?? null;
}
