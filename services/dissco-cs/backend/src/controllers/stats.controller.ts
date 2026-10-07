import { Context, Hono } from 'hono';

import { DisscoCSRepository } from '../db.js';
import { requestMadocUserIdentity, resolveSiteId } from '../jwt.js';
import { HonourBoardRepository, isHonourBoardPeriod } from '../madoc-db/honour-board.repository.js';
import { StatsRepository } from '../madoc-db/stats.repository.js';

// All public numbers (counters and honour board), for the whole site or scoped to one active
// institution. Every `/current` variant is a pure cache read for the frontend's periodic poll --
// it never triggers a recompute itself, and only falls back to the triggering path if nothing has
// ever been cached yet.
export function statsController(
  repository: DisscoCSRepository,
  statsRepository: StatsRepository,
  honourBoardRepository: HonourBoardRepository
): Hono {
  const app = new Hono();

  // Resolves the site and the active institution behind `:slug`, or the error response to return.
  async function resolveInstitution(c: Context): Promise<{ siteId: number; institutionId: number } | Response> {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const institution = await repository.institutions.getActiveInstitutionBySlug(siteId, c.req.param('slug') ?? '');
    if (!institution) {
      return c.notFound();
    }

    return { siteId, institutionId: institution.id };
  }

  async function institutionTaskIds(siteId: number, institutionId: number): Promise<string[]> {
    const projectSlugs = await repository.institutions.listProjectSlugsForInstitution(siteId, institutionId);
    const projects = await statsRepository.resolveProjects(siteId, projectSlugs);
    return projects.map(p => p.task_id);
  }

  function userUrnOf(c: Context): string | null {
    const identity = requestMadocUserIdentity(c);
    return identity ? `urn:madoc:user:${identity.userId}` : null;
  }

  // ---- site ----

  app.get('/', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    return c.json(await statsRepository.getSite(siteId));
  });

  app.get('/current', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    return c.json(await statsRepository.getSiteCurrent(siteId));
  });

  app.get('/honour-board/:period', async c => {
    const period = c.req.param('period');
    if (!isHonourBoardPeriod(period)) {
      return c.text('Unknown period', 400);
    }

    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const result = await honourBoardRepository.getSitePeriod(siteId, period, userUrnOf(c));
    return c.json(result);
  });

  app.get('/honour-board/:period/current', async c => {
    const period = c.req.param('period');
    if (!isHonourBoardPeriod(period)) {
      return c.text('Unknown period', 400);
    }

    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
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

    const projectSlugs = await repository.institutions.listProjectSlugsForInstitution(scope.siteId, scope.institutionId);
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

    const projectSlugs = await repository.institutions.listProjectSlugsForInstitution(scope.siteId, scope.institutionId);
    const overview = await statsRepository.getInstitution(scope.siteId, scope.institutionId, projectSlugs);
    return c.json(overview);
  });

  app.get('/institutions/:slug/honour-board/:period', async c => {
    const period = c.req.param('period');
    if (!isHonourBoardPeriod(period)) {
      return c.text('Unknown period', 400);
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
      return c.text('Unknown period', 400);
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
