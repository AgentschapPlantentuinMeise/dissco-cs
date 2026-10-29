import { Hono } from 'hono';
import { siteColorsSchema } from '@dissco-cs/shared-types';
import { SiteThemeRepository, toSiteThemeDto } from '../repositories/site-theme.repository.js';
import { requireSiteAdmin, requireSiteId } from '../auth/auth.js';
import { validateJson } from '../infrastructure/validate-json.js';
import { getSiteTitle } from '../madoc-client/site.js';

export function siteThemeController(siteThemeRepository: SiteThemeRepository): Hono {
  const app = new Hono();

  app.get('/', async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    // The name is Madoc's own site title: it is set and changed in Madoc's site admin, not here.
    const slug = c.req.query('slug');
    const [row, name] = await Promise.all([siteThemeRepository.get(siteId), slug ? getSiteTitle(slug) : null]);
    return c.json(toSiteThemeDto(row, name));
  });

  // The writes live under /colors, not on / itself: the gateway lets /site-theme through without
  // checking the JWT (anonymous visitors need the palette and the name), and requireSiteAdmin only
  // reads the JWT's payload.
  app.put('/colors', validateJson(siteColorsSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    await siteThemeRepository.upsertColors(identity.siteId, c.req.valid('json'));
    return c.body(null, 204);
  });

  app.delete('/colors', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    await siteThemeRepository.clearColors(identity.siteId);
    return c.body(null, 204);
  });

  return app;
}
