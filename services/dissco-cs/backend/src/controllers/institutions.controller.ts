import { Hono } from 'hono';
import { requireSiteAdmin, requireSiteId } from '../auth/auth.js';
import { InstitutionsRepository, toInstitutionDto } from '../repositories/institutions.repository.js';
import { validateJson } from '../infrastructure/validate-json.js';
import { intId, safeSegment, validateParams } from '../infrastructure/validate-params.js';
import { institutionInputSchema } from '@dissco-cs/shared-types';

export function institutionsController(institutionsRepository: InstitutionsRepository): Hono {
  const app = new Hono();

  app.get('/active', async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const institutions = await institutionsRepository.listActiveInstitutions(siteId);
    return c.json({ institutions: institutions.map(toInstitutionDto) });
  });

  app.get('/active/:slug', validateParams({ slug: safeSegment }), async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const institution = await institutionsRepository.getActiveInstitutionBySlug(siteId, c.req.valid('param').slug);
    if (!institution) {
      return c.notFound();
    }

    return c.json(toInstitutionDto(institution));
  });

  app.get('/active/:slug/projects', validateParams({ slug: safeSegment }), async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const institution = await institutionsRepository.getActiveInstitutionBySlug(siteId, c.req.valid('param').slug);
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

  app.post('/', validateJson(institutionInputSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const input = c.req.valid('json');

    const institution = await institutionsRepository.createInstitution(identity.siteId, input);
    return c.json(toInstitutionDto(institution), 201);
  });

  app.put('/:id', validateParams({ id: intId }), validateJson(institutionInputSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { id } = c.req.valid('param');

    const input = c.req.valid('json');

    const institution = await institutionsRepository.updateInstitution(identity.siteId, id, input);
    if (!institution) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  app.delete('/:id', validateParams({ id: intId }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { id } = c.req.valid('param');

    const deleted = await institutionsRepository.deleteInstitution(identity.siteId, id);
    if (!deleted) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  return app;
}
