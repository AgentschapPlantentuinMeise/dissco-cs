import { serviceJson } from './client.js';
import { madocPath } from './path-segment.js';

// Site role of a single user (e.g. 'reviewer', 'trusted-user', 'admin') -- for the nav
// visibility check, separate from the per-project manuallyAssignedReviewer assignment.
export async function getMadocSiteUserRole(siteId: number, userId: number): Promise<string | null> {
  const data = await serviceJson<{ user?: { site_role?: string } }>(madocPath`/api/madoc/manage-site/users/${userId}`, {
    siteId,
    headers: { 'x-madoc-user-id': String(userId) },
  });
  return data.user?.site_role ?? null;
}
