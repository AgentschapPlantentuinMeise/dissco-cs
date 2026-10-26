import { Hono } from 'hono';
import { siteColorsSchema, siteNameSchema, SiteThemeDto } from '@dissco-cs/shared-types';
import { SiteThemeRepository, toSiteColors } from '../repositories/site-theme.repository.js';
import { requireSiteAdmin, requireSiteId } from '../auth/auth.js';
import { validateJson } from '../infrastructure/validate-json.js';

export function siteThemeController(siteThemeRepository: SiteThemeRepository): Hono {
  const app = new Hono();

  app.get('/', async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const row = await siteThemeRepository.get(siteId);
    const result: SiteThemeDto = { colors: row ? toSiteColors(row) : null, name: row?.site_name ?? null };
    return c.json(result);
  });

  // The writes live under /colors and /name, not on / itself: the gateway lets /site-theme through
  // without checking the JWT (anonymous visitors need the palette and the name), and
  // requireSiteAdmin only reads the JWT's payload.
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

  app.put('/name', validateJson(siteNameSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { name } = c.req.valid('json');
    await siteThemeRepository.setName(identity.siteId, name || null);
    return c.body(null, 204);
  });

  return app;
}
