import { Hono } from 'hono';
import { DisscoCSRepository } from '../db.js';
import { requireSiteAdmin, resolveSiteId } from '../jwt.js';
import {
  InstitutionBody,
  PruneProjectLinksBody,
  SetInstitutionLinkBody,
  SetInstitutionsOrderBody,
  parseInstitutionBody,
  parsePruneProjectLinksBody,
  parseSetInstitutionLinkBody,
} from '../validators.js';

export function institutionsRoutes(repository: DisscoCSRepository): Hono {
  const app = new Hono();

  app.get('/active', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const institutions = await repository.institutions.listActiveInstitutions(siteId);
    return c.json({ institutions });
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

    return c.json(institution);
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

  app.get('/for-project/:projectSlug', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const institution = await repository.institutions.getActiveInstitutionForProjectSlug(siteId, c.req.param('projectSlug'));
    if (!institution) {
      return c.notFound();
    }

    return c.json(institution);
  });

  app.get('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const institutions = await repository.institutions.listInstitutions(identity.siteId);
    return c.json({ institutions });
  });

  app.post('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const payload = parseInstitutionBody((await c.req.json().catch(() => null)) as InstitutionBody | null);
    if (!payload) {
      return c.text('Invalid institution payload', 400);
    }

    const institution = await repository.institutions.createInstitution(identity.siteId, payload);
    return c.json(institution, 201);
  });

  app.put('/order', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const payload = (await c.req.json().catch(() => null)) as SetInstitutionsOrderBody | null;
    if (!payload || !Array.isArray(payload.order) || !payload.order.every(id => Number.isInteger(id))) {
      return c.text('order must be an array of institution ids', 400);
    }

    await repository.institutions.setInstitutionsOrder(identity.siteId, payload.order as number[]);
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

    const payload = parseSetInstitutionLinkBody((await c.req.json().catch(() => null)) as SetInstitutionLinkBody | null);
    if (!payload) {
      return c.text('Invalid payload', 400);
    }

    if (payload.institutionId !== null) {
      const institution = await repository.institutions.getInstitutionById(identity.siteId, payload.institutionId);
      if (!institution) {
        return c.text('Institution not found', 404);
      }
    }

    await repository.institutions.setProjectLink(identity.siteId, c.req.param('projectId'), payload.institutionId);
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

    const payload = parsePruneProjectLinksBody((await c.req.json().catch(() => null)) as PruneProjectLinksBody | null);
    if (!payload) {
      return c.text('Invalid payload', 400);
    }

    const removed = await repository.institutions.pruneOrphanedProjectLinks(identity.siteId, payload.liveSlugs);
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

    const payload = parseInstitutionBody((await c.req.json().catch(() => null)) as InstitutionBody | null);
    if (!payload) {
      return c.text('Invalid institution payload', 400);
    }

    const institution = await repository.institutions.updateInstitution(identity.siteId, id, payload);
    if (!institution) {
      return c.notFound();
    }

    return c.json(institution);
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
