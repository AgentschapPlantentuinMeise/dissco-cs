import { Context, Hono } from 'hono';

import { InstitutionsRepository } from '../repositories/institutions.repository.js';
import { requestMadocUserIdentity, requireSiteId } from '../auth/auth.js';
import { HonourBoardRepository, isHonourBoardPeriod } from '../madoc-db/honour-board.repository.js';
import { StatsRepository } from '../madoc-db/stats.repository.js';

// Every number has two routes. The normal route answers with the cached value right away and then
// recalculates it in the background, so the next request sees fresh numbers; only the very first
// request, with nothing cached yet, waits for the calculation. The /current twin is for the
// frontend's polling every few seconds: it returns the cached value without recalculating, so
// polling cannot overload the database (with nothing cached yet, it calculates once).
// Exception: the site's volunteer count is recalculated at most every 5 minutes, also via /current.
export function statsController(
  institutionsRepository: InstitutionsRepository,
  statsRepository: StatsRepository,
  honourBoardRepository: HonourBoardRepository
): Hono {
  const app = new Hono();

  async function resolveInstitution(c: Context): Promise<{ siteId: number; institutionId: number } | Response> {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const institution = await institutionsRepository.getActiveInstitutionBySlug(siteId, c.req.param('slug') ?? '');
    if (!institution) {
      return c.notFound();
    }

    return { siteId, institutionId: institution.id };
  }

  async function institutionTaskIds(siteId: number, institutionId: number): Promise<string[]> {
    const projectSlugs = await institutionsRepository.listProjectSlugsForInstitution(siteId, institutionId);
    const projects = await statsRepository.resolveProjects(siteId, projectSlugs);
    return projects.map(p => p.task_id);
  }

  function userUrnOf(c: Context): string | null {
    const identity = requestMadocUserIdentity(c);
    return identity ? `urn:madoc:user:${identity.userId}` : null;
  }

  // ---- site ----

  app.get('/', async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    return c.json(await statsRepository.getSite(siteId));
  });

  app.get('/current', async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    return c.json(await statsRepository.getSiteCurrent(siteId));
  });

  app.get('/honour-board/:period', async c => {
    const period = c.req.param('period');
    if (!isHonourBoardPeriod(period)) {
      return c.json({ error: 'Unknown period' }, 400);
    }

    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const result = await honourBoardRepository.getSitePeriod(siteId, period, userUrnOf(c));
    return c.json(result);
  });

  app.get('/honour-board/:period/current', async c => {
    const period = c.req.param('period');
    if (!isHonourBoardPeriod(period)) {
      return c.json({ error: 'Unknown period' }, 400);
    }

    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const userUrn = userUrnOf(c);
    const result =
      honourBoardRepository.peekSitePeriod(siteId, period, userUrn) ?? (await honourBoardRepository.getSitePeriod(siteId, period, userUrn));
    return c.json(result);
  });

  // ---- institution ----

  app.get('/institutions/:slug', async c => {
    const scope = await resolveInstitution(c);
    if (scope instanceof Response) {
      return scope;
    }

    const projectSlugs = await institutionsRepository.listProjectSlugsForInstitution(scope.siteId, scope.institutionId);
    const overview = await statsRepository.getInstitution(scope.siteId, scope.institutionId, projectSlugs);
    return c.json(overview);
  });

  app.get('/institutions/:slug/current', async c => {
    const scope = await resolveInstitution(c);
    if (scope instanceof Response) {
      return scope;
    }

    const cached = statsRepository.peekInstitution(scope.siteId, scope.institutionId);
    if (cached) {
      return c.json(cached);
    }

    const projectSlugs = await institutionsRepository.listProjectSlugsForInstitution(scope.siteId, scope.institutionId);
    const overview = await statsRepository.getInstitution(scope.siteId, scope.institutionId, projectSlugs);
    return c.json(overview);
  });

  app.get('/institutions/:slug/honour-board/:period', async c => {
    const period = c.req.param('period');
    if (!isHonourBoardPeriod(period)) {
      return c.json({ error: 'Unknown period' }, 400);
    }

    const scope = await resolveInstitution(c);
    if (scope instanceof Response) {
      return scope;
    }

    const taskIds = await institutionTaskIds(scope.siteId, scope.institutionId);
    const result = await honourBoardRepository.getInstitutionPeriod(scope.siteId, scope.institutionId, taskIds, period, userUrnOf(c));
    return c.json(result);
  });

  app.get('/institutions/:slug/honour-board/:period/current', async c => {
    const period = c.req.param('period');
    if (!isHonourBoardPeriod(period)) {
      return c.json({ error: 'Unknown period' }, 400);
    }

    const scope = await resolveInstitution(c);
    if (scope instanceof Response) {
      return scope;
    }

    const userUrn = userUrnOf(c);
    const cached = honourBoardRepository.peekInstitutionPeriod(scope.siteId, scope.institutionId, period, userUrn);
    if (cached) {
      return c.json(cached);
    }

    const taskIds = await institutionTaskIds(scope.siteId, scope.institutionId);
    const result = await honourBoardRepository.getInstitutionPeriod(scope.siteId, scope.institutionId, taskIds, period, userUrn);
    return c.json(result);
  });

  return app;
}
