import { Hono } from 'hono';

import { requestMadocUserIdentity, resolveSiteId } from '../jwt.js';
import { HonourBoardRepository, isHonourBoardPeriod } from '../repositories/honour-board.repository.js';

export function honourBoardRoutes(repository: HonourBoardRepository): Hono {
  const app = new Hono();

  app.get('/:period', async c => {
    const period = c.req.param('period');
    if (!isHonourBoardPeriod(period)) {
      return c.text('Unknown period', 400);
    }

    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const identity = requestMadocUserIdentity(c);
    const userUrn = identity ? `urn:madoc:user:${identity.userId}` : null;

    const result = await repository.getSitePeriod(siteId, period, userUrn);
    return c.json(result);
  });

  // Pure cache read for the frontend's periodic poll -- never triggers a recompute itself,
  // unlike '/:period'. Falls back to the triggering path only if nothing has ever been cached yet.
  app.get('/:period/current', async c => {
    const period = c.req.param('period');
    if (!isHonourBoardPeriod(period)) {
      return c.text('Unknown period', 400);
    }

    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const identity = requestMadocUserIdentity(c);
    const userUrn = identity ? `urn:madoc:user:${identity.userId}` : null;

    const result = repository.peekSitePeriod(siteId, period, userUrn) ?? (await repository.getSitePeriod(siteId, period, userUrn));
    return c.json(result);
  });

  return app;
}
