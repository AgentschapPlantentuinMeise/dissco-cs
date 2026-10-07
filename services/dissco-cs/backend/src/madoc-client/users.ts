import { appConfig } from '../config.js';
import { getServiceJwt } from './client.js';

// Site role of a single user (e.g. 'reviewer', 'trusted-user', 'admin') -- for the nav
// visibility check, separate from the per-project manuallyAssignedReviewer assignment.
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
