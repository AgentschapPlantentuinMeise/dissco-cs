import { appConfig } from '../config.js';
import { getServiceJwt } from './client.js';
import { getMadocProjectManifestsAndTaskStats } from './collections.js';
import { listAllMadocProjects } from './projects.js';

const volunteerCountCache = new Map<number, { count: number; expiresAt: number }>();
const VOLUNTEER_COUNT_CACHE_TTL_MS = 5 * 60 * 1000;

// Registered, active volunteers on the site: all site users minus automated (service) accounts
// and minus deactivated ones. The list route (/manage-site/users) doesn't include is_active, so
// it's checked per non-automated candidate via the detail route (which does filter on
// is_active=true internally, see getMadocSiteUserRole in users.ts) -- hence the short cache below.
export async function getMadocSiteVolunteerCount(siteId: number): Promise<number> {
  const cached = volunteerCountCache.get(siteId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.count;
  }

  const listResponse = await fetch(`${appConfig.madocGatewayUrl}/api/madoc/manage-site/users`, {
    headers: {
      Authorization: `Bearer ${getServiceJwt()}`,
      'x-madoc-site-id': String(siteId),
      // Dummy but truthy user id, only needed to pass the site.admin scope check on the Madoc
      // route (userWithScope requires a truthy id on the token) -- the value itself is unused.
      'x-madoc-user-id': '1',
    },
  });

  if (!listResponse.ok) {
    throw new Error(`Madoc site-users request failed with status ${listResponse.status}`);
  }

  const { users } = (await listResponse.json()) as { users: Array<{ id: number; automated?: boolean }> };
  const candidates = users.filter(user => !user.automated);

  const activeFlags = await Promise.all(
    candidates.map(async user => {
      const detailResponse = await fetch(`${appConfig.madocGatewayUrl}/api/madoc/manage-site/users/${user.id}`, {
        headers: {
          Authorization: `Bearer ${getServiceJwt()}`,
          'x-madoc-site-id': String(siteId),
          'x-madoc-user-id': String(user.id),
        },
      });
      return detailResponse.ok;
    })
  );

  const count = activeFlags.filter(Boolean).length;
  volunteerCountCache.set(siteId, { count, expiresAt: Date.now() + VOLUNTEER_COUNT_CACHE_TTL_MS });
  return count;
}

export type SiteTaskTotals = { completed: number; total: number };

const taskTotalsCache = new Map<number, { totals: SiteTaskTotals; expiresAt: number }>();
const TASK_TOTALS_CACHE_TTL_MS = 30 * 60 * 1000;

// Site-wide "tasks completed / total": sum of manifest count per project (total) and manifests
// with task status in-review or completed (done), across every project ever. Same calculation
// as project-progress.routes.ts does per project, summed here. A project that fails (e.g. a
// broken collection) is skipped rather than failing the whole sum. Heavier than
// getMadocSiteVolunteerCount (2 Madoc calls per project), hence the longer cache.
export async function getMadocSiteTaskTotals(siteId: number): Promise<SiteTaskTotals> {
  const cached = taskTotalsCache.get(siteId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.totals;
  }

  const projects = await listAllMadocProjects(siteId);

  const perProjectTotals = await Promise.all(
    projects.map(async (project): Promise<SiteTaskTotals> => {
      try {
        const { manifestItems, taskStats } = await getMadocProjectManifestsAndTaskStats(
          siteId,
          project.collection_id,
          project.task_id
        );

        const statuses = taskStats.statuses || {};
        const completed = (statuses['2'] || 0) + (statuses['3'] || 0);

        return { completed, total: manifestItems.length };
      } catch (err) {
        console.error('[site-stats] task totals fetch failed for project', project.id, err);
        return { completed: 0, total: 0 };
      }
    })
  );

  const totals = perProjectTotals.reduce(
    (acc, p) => ({ completed: acc.completed + p.completed, total: acc.total + p.total }),
    { completed: 0, total: 0 }
  );

  taskTotalsCache.set(siteId, { totals, expiresAt: Date.now() + TASK_TOTALS_CACHE_TTL_MS });
  return totals;
}
