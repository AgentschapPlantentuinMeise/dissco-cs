import { Hono } from 'hono';
import { requireSiteAdmin, resolveSiteId } from '../jwt.js';
import { parseInstitutionBody } from '../validators.js';
export function institutionsRoutes(repository) {
    const app = new Hono();
    app.get('/active', async (c) => {
        const siteId = await resolveSiteId(c);
        if (siteId === null) {
            return c.text('Could not resolve site', 400);
        }
        const institutions = await repository.institutions.listActiveInstitutions(siteId);
        return c.json({ institutions });
    });
    app.get('/active/:slug', async (c) => {
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
    app.get('/', async (c) => {
        const identity = requireSiteAdmin(c);
        if (identity instanceof Response) {
            return identity;
        }
        const institutions = await repository.institutions.listInstitutions(identity.siteId);
        return c.json({ institutions });
    });
    app.post('/', async (c) => {
        const identity = requireSiteAdmin(c);
        if (identity instanceof Response) {
            return identity;
        }
        const payload = parseInstitutionBody((await c.req.json().catch(() => null)));
        if (!payload) {
            return c.text('Invalid institution payload', 400);
        }
        const institution = await repository.institutions.createInstitution(identity.siteId, payload);
        return c.json(institution, 201);
    });
    app.put('/order', async (c) => {
        const identity = requireSiteAdmin(c);
        if (identity instanceof Response) {
            return identity;
        }
        const payload = (await c.req.json().catch(() => null));
        if (!payload || !Array.isArray(payload.order) || !payload.order.every(id => Number.isInteger(id))) {
            return c.text('order must be an array of institution ids', 400);
        }
        await repository.institutions.setInstitutionsOrder(identity.siteId, payload.order);
        return c.body(null, 204);
    });
    app.put('/:id', async (c) => {
        const identity = requireSiteAdmin(c);
        if (identity instanceof Response) {
            return identity;
        }
        const id = Number(c.req.param('id'));
        if (!Number.isInteger(id)) {
            return c.notFound();
        }
        const payload = parseInstitutionBody((await c.req.json().catch(() => null)));
        if (!payload) {
            return c.text('Invalid institution payload', 400);
        }
        const institution = await repository.institutions.updateInstitution(identity.siteId, id, payload);
        if (!institution) {
            return c.notFound();
        }
        return c.json(institution);
    });
    app.delete('/:id', async (c) => {
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
