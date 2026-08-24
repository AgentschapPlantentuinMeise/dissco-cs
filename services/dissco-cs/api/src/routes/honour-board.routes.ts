import { Hono } from 'hono';

import { requestMadocUserIdentity, resolveSiteId } from '../jwt.js';
import { HonourBoardRepository } from '../repositories/honour-board.repository.js';

export function honourBoardRoutes(repository: HonourBoardRepository): Hono {
  const app = new Hono();

  app.get('/', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const identity = requestMadocUserIdentity(c);
    const userUrn = identity ? `urn:madoc:user:${identity.userId}` : null;

    const leaderboard = await repository.getLeaderboard(siteId, userUrn);
    return c.json(leaderboard);
  });

  // Pure cache read for the frontend's periodic poll -- never triggers a recompute itself,
  // unlike '/'. Falls back to the triggering path only if nothing has ever been cached yet.
  app.get('/current', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const identity = requestMadocUserIdentity(c);
    const userUrn = identity ? `urn:madoc:user:${identity.userId}` : null;

    const leaderboard = repository.peekLeaderboard(siteId, userUrn) ?? (await repository.getLeaderboard(siteId, userUrn));
    return c.json(leaderboard);
  });

  return app;
}
