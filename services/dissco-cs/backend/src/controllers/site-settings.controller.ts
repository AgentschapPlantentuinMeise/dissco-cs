import { Hono } from 'hono';
import { honourBoardSettingsSchema } from '@dissco-cs/shared-types';
import { SiteSettingsRepository, toHonourBoardSettingsDto } from '../repositories/site-settings.repository.js';
import { requireSiteAdmin } from '../auth/auth.js';
import { validateJson } from '../infrastructure/validate-json.js';

// Per group of settings a sub-path (/honour-board), so a later group gets its own route and schema.
// Visitors never read these routes: the band gets the mode and threshold with each quarter.
export function siteSettingsController(siteSettingsRepository: SiteSettingsRepository): Hono {
  const app = new Hono();

  app.get('/honour-board', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    return c.json(toHonourBoardSettingsDto(await siteSettingsRepository.get(identity.siteId)));
  });

  app.put('/honour-board', validateJson(honourBoardSettingsSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    await siteSettingsRepository.setHonourBoard(identity.siteId, identity.userId, c.req.valid('json'));
    return c.body(null, 204);
  });

  return app;
}
