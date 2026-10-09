import { Hono } from 'hono';
import { requireSiteAdmin, resolveSiteId } from '../auth/auth.js';
import { InstitutionsRepository, toInstitutionDto } from '../repositories/institutions.repository.js';
import { institutionInputSchema, setInstitutionsOrderSchema } from '@dissco-cs/shared-types';

// The institution itself. Its numbers live in stats.controller.ts (/stats/institutions/:slug), its
// project links in projects.controller.ts (/projects/:projectId/institution).
export function institutionsController(institutionsRepository: InstitutionsRepository): Hono {
  const app = new Hono();

  app.get('/active', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const institutions = await institutionsRepository.listActiveInstitutions(siteId);
    return c.json({ institutions: institutions.map(toInstitutionDto) });
  });

  app.get('/active/:slug', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const institution = await institutionsRepository.getActiveInstitutionBySlug(siteId, c.req.param('slug'));
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

    const institution = await institutionsRepository.getActiveInstitutionBySlug(siteId, c.req.param('slug'));
    if (!institution) {
      return c.notFound();
    }

    const projectSlugs = await institutionsRepository.listProjectSlugsForInstitution(siteId, institution.id);
    return c.json({ projectSlugs });
  });

  app.get('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const institutions = await institutionsRepository.listInstitutions(identity.siteId);
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

    const institution = await institutionsRepository.createInstitution(identity.siteId, result.data);
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

    await institutionsRepository.setInstitutionsOrder(identity.siteId, result.data.order);
    return c.body(null, 204);
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

    const institution = await institutionsRepository.updateInstitution(identity.siteId, id, result.data);
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

    const deleted = await institutionsRepository.deleteInstitution(identity.siteId, id);
    if (!deleted) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  return app;
}
