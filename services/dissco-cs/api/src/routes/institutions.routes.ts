import { Hono } from 'hono';
import { DisscoCSRepository } from '../db.js';
import { requireSiteAdmin, requestMadocUserIdentity, resolveSiteId } from '../jwt.js';
import { HonourBoardRepository, isHonourBoardPeriod } from '../repositories/honour-board.repository.js';
import { InstitutionStatsRepository } from '../repositories/institution-stats.repository.js';
import { InstitutionRow } from '../repositories/institutions.repository.js';
import { pruneProjectLinksSchema, setInstitutionLinkSchema, setInstitutionsOrderSchema } from '../validators.js';
import { InstitutionDto, institutionInputSchema } from '@dissco-cs/shared-types';

// created_at/updated_at are DB bookkeeping (see InstitutionRow), never part of the wire DTO.
function toInstitutionDto(row: InstitutionRow): InstitutionDto {
  const { created_at, updated_at, ...dto } = row;
  return dto;
}

export function institutionsRoutes(
  repository: DisscoCSRepository,
  institutionStatsRepository: InstitutionStatsRepository,
  honourBoardRepository: HonourBoardRepository
): Hono {
  const app = new Hono();

  app.get('/active', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const institutions = await repository.institutions.listActiveInstitutions(siteId);
    return c.json({ institutions: institutions.map(toInstitutionDto) });
  });

  app.get('/active/:slug', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const institution = await repository.institutions.getActiveInstitutionBySlug(siteId, c.req.param('slug'));
    if (!institution) {
      return c.notFound();
    }

    return c.json(toInstitutionDto(institution));
  });

  app.get('/active/:slug/projects', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const institution = await repository.institutions.getActiveInstitutionBySlug(siteId, c.req.param('slug'));
    if (!institution) {
      return c.notFound();
    }

    const projectSlugs = await repository.institutions.listProjectSlugsForInstitution(siteId, institution.id);
    return c.json({ projectSlugs });
  });

  app.get('/active/:slug/stats', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const institution = await repository.institutions.getActiveInstitutionBySlug(siteId, c.req.param('slug'));
    if (!institution) {
      return c.notFound();
    }

    const projectSlugs = await repository.institutions.listProjectSlugsForInstitution(siteId, institution.id);
    const overview = await institutionStatsRepository.getOverview(siteId, institution.id, projectSlugs);
    return c.json(overview);
  });

  // Pure cache read for the frontend's periodic poll -- never triggers a recompute itself,
  // unlike '/stats'. Falls back to the triggering path only if nothing has ever been cached yet.
  app.get('/active/:slug/stats/current', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const institution = await repository.institutions.getActiveInstitutionBySlug(siteId, c.req.param('slug'));
    if (!institution) {
      return c.notFound();
    }

    const cached = institutionStatsRepository.peekOverview(siteId, institution.id);
    if (cached) {
      return c.json(cached);
    }

    const projectSlugs = await repository.institutions.listProjectSlugsForInstitution(siteId, institution.id);
    const overview = await institutionStatsRepository.getOverview(siteId, institution.id, projectSlugs);
    return c.json(overview);
  });

  app.get('/active/:slug/honour-board/:period', async c => {
    const period = c.req.param('period');
    if (!isHonourBoardPeriod(period)) {
      return c.text('Unknown period', 400);
    }

    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const institution = await repository.institutions.getActiveInstitutionBySlug(siteId, c.req.param('slug'));
    if (!institution) {
      return c.notFound();
    }

    const identity = requestMadocUserIdentity(c);
    const userUrn = identity ? `urn:madoc:user:${identity.userId}` : null;

    const projectSlugs = await repository.institutions.listProjectSlugsForInstitution(siteId, institution.id);
    const projects = await institutionStatsRepository.resolveProjects(siteId, projectSlugs);
    const taskIds = projects.map(p => p.task_id);

    const result = await honourBoardRepository.getInstitutionPeriod(siteId, institution.id, taskIds, period, userUrn);
    return c.json(result);
  });

  // Pure cache read for the frontend's periodic poll -- never triggers a recompute itself,
  // unlike '/honour-board/:period'. Falls back to the triggering path only if nothing has ever
  // been cached yet.
  app.get('/active/:slug/honour-board/:period/current', async c => {
    const period = c.req.param('period');
    if (!isHonourBoardPeriod(period)) {
      return c.text('Unknown period', 400);
    }

    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const institution = await repository.institutions.getActiveInstitutionBySlug(siteId, c.req.param('slug'));
    if (!institution) {
      return c.notFound();
    }

    const identity = requestMadocUserIdentity(c);
    const userUrn = identity ? `urn:madoc:user:${identity.userId}` : null;

    const cached = honourBoardRepository.peekInstitutionPeriod(siteId, institution.id, period, userUrn);
    if (cached) {
      return c.json(cached);
    }

    const projectSlugs = await repository.institutions.listProjectSlugsForInstitution(siteId, institution.id);
    const projects = await institutionStatsRepository.resolveProjects(siteId, projectSlugs);
    const taskIds = projects.map(p => p.task_id);

    const result = await honourBoardRepository.getInstitutionPeriod(siteId, institution.id, taskIds, period, userUrn);
    return c.json(result);
  });

  app.get('/for-project/:projectSlug', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const institution = await repository.institutions.getActiveInstitutionForProjectSlug(siteId, c.req.param('projectSlug'));
    if (!institution) {
      return c.notFound();
    }

    return c.json(toInstitutionDto(institution));
  });

  app.get('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const institutions = await repository.institutions.listInstitutions(identity.siteId);
    return c.json({ institutions: institutions.map(toInstitutionDto) });
  });

  app.post('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const result = institutionInputSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('Invalid institution payload', 400);
    }

    const institution = await repository.institutions.createInstitution(identity.siteId, result.data);
    return c.json(toInstitutionDto(institution), 201);
  });

  app.put('/order', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const result = setInstitutionsOrderSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('order must be an array of institution ids', 400);
    }

    await repository.institutions.setInstitutionsOrder(identity.siteId, result.data.order);
    return c.body(null, 204);
  });

  app.get('/project-links', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const links = await repository.institutions.listProjectLinks(identity.siteId);
    return c.json({ links });
  });

  app.put('/project-links/:projectId', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const result = setInstitutionLinkSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('Invalid payload', 400);
    }

    if (result.data.institutionId !== null) {
      const institution = await repository.institutions.getInstitutionById(identity.siteId, result.data.institutionId);
      if (!institution) {
        return c.text('Institution not found', 404);
      }
    }

    await repository.institutions.setProjectLink(identity.siteId, c.req.param('projectId'), result.data.institutionId);
    return c.body(null, 204);
  });

  // Ruimt links op naar projecten die niet meer in de meegegeven live-Madoc-lijst voorkomen
  // (bv. omdat het project in Madoc verwijderd is) -- wordt door de frontend op de achtergrond
  // aangeroepen zodra de projectbeheer-pagina de actuele projectenlijst heeft opgehaald.
  app.put('/project-links/prune', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const result = pruneProjectLinksSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('Invalid payload', 400);
    }

    const removed = await repository.institutions.pruneOrphanedProjectLinks(identity.siteId, result.data.liveSlugs);
    return c.json({ removed });
  });

  app.put('/:id', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) {
      return c.notFound();
    }

    const result = institutionInputSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.text('Invalid institution payload', 400);
    }

    const institution = await repository.institutions.updateInstitution(identity.siteId, id, result.data);
    if (!institution) {
      return c.notFound();
    }

    return c.json(toInstitutionDto(institution));
  });

  app.delete('/:id', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) {
      return c.notFound();
    }

    const deleted = await repository.institutions.deleteInstitution(identity.siteId, id);
    if (!deleted) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  return app;
}
