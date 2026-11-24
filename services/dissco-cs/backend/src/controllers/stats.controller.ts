import { Context, Hono } from 'hono';

import { HonourBoardQuarterDto, HonourBoardQuarterKey } from '@dissco-cs/shared-types';

import { InstitutionsRepository } from '../repositories/institutions.repository.js';
import { FormsRepository } from '../repositories/forms.repository.js';
import { listInstitutionProjectSlugs } from './forms.lookup.js';
import { requestMadocUserIdentity, requireSiteId } from '../auth/auth.js';
import { HonourBoardQuarterLoader } from '../madoc-db/honour-board.loader.js';
import { quarterToDto } from '../madoc-db/honour-board.logic.js';
import { StatsRepository } from '../madoc-db/stats.repository.js';
import { honourBoardQuarter, safeSegment, validateParams } from '../infrastructure/validate-params.js';

// Every number has two routes. The normal route answers with the cached value right away and then
// recalculates it in the background, so the next request sees fresh numbers; only the very first
// request, with nothing cached yet, waits for the calculation. The /current twin is for the
// frontend's polling every few seconds: it returns the cached value without recalculating, so
// polling cannot overload the database (with nothing cached yet, it calculates once).
// Exception: the site's volunteer count is recalculated at most every 5 minutes, also via /current.
export function statsController(
  institutionsRepository: InstitutionsRepository,
  formsRepository: FormsRepository,
  statsRepository: StatsRepository,
  quarterLoader: HonourBoardQuarterLoader
): Hono {
  const app = new Hono();

  async function resolveInstitution(c: Context, slug: string): Promise<{ siteId: number; institutionId: number } | Response> {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const institution = await institutionsRepository.getActiveInstitutionBySlug(siteId, slug);
    if (!institution) {
      return c.notFound();
    }

    return { siteId, institutionId: institution.id };
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

  async function honourBoardQuarterDto(
    c: Context,
    siteId: number,
    quarter: HonourBoardQuarterKey,
    cachedOnly: boolean
  ): Promise<HonourBoardQuarterDto> {
    const { settings, record, counts } = await quarterLoader.load(siteId, quarter, cachedOnly);
    return quarterToDto(counts, settings, record, userUrnOf(c));
  }

  app.get('/honour-board/:quarter', validateParams({ quarter: honourBoardQuarter }), async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    return c.json(await honourBoardQuarterDto(c, siteId, c.req.valid('param').quarter, false));
  });

  app.get('/honour-board/:quarter/current', validateParams({ quarter: honourBoardQuarter }), async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    return c.json(await honourBoardQuarterDto(c, siteId, c.req.valid('param').quarter, true));
  });

  // ---- institution ----

  app.get('/institutions/:slug', validateParams({ slug: safeSegment }), async c => {
    const scope = await resolveInstitution(c, c.req.valid('param').slug);
    if (scope instanceof Response) {
      return scope;
    }

    const projectSlugs = await listInstitutionProjectSlugs(formsRepository, scope.siteId, scope.institutionId);
    const overview = await statsRepository.getInstitution(scope.siteId, scope.institutionId, projectSlugs);
    return c.json(overview);
  });

  app.get('/institutions/:slug/current', validateParams({ slug: safeSegment }), async c => {
    const scope = await resolveInstitution(c, c.req.valid('param').slug);
    if (scope instanceof Response) {
      return scope;
    }

    const cached = statsRepository.peekInstitution(scope.siteId, scope.institutionId);
    if (cached) {
      return c.json(cached);
    }

    const projectSlugs = await listInstitutionProjectSlugs(formsRepository, scope.siteId, scope.institutionId);
    const overview = await statsRepository.getInstitution(scope.siteId, scope.institutionId, projectSlugs);
    return c.json(overview);
  });

  return app;
}
