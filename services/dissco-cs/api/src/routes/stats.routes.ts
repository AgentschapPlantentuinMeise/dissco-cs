import { Hono } from 'hono';

import { resolveSiteId } from '../jwt.js';
import { MadocUsersRepository } from '../repositories/madoc-users.repository.js';
import { SiteTaskTotalsRepository } from '../repositories/site-task-totals.repository.js';

export function statsRoutes(madocUsersRepository: MadocUsersRepository, siteTaskTotalsRepository: SiteTaskTotalsRepository): Hono {
  const app = new Hono();

  app.get('/', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const [volunteers, taskTotals] = await Promise.all([
      madocUsersRepository.getActiveVolunteerCount(siteId),
      siteTaskTotalsRepository.getTotals(siteId),
    ]);

    return c.json({ volunteers, tasksCompleted: taskTotals.completed, tasksTotal: taskTotals.total });
  });

  // Pure cache read for the frontend's periodic poll -- never triggers a recompute itself,
  // unlike '/'. Falls back to the triggering path only if nothing has ever been cached yet.
  app.get('/current', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const [volunteers, taskTotals] = await Promise.all([
      madocUsersRepository.getActiveVolunteerCount(siteId),
      siteTaskTotalsRepository.peekTotals(siteId) ?? (await siteTaskTotalsRepository.getTotals(siteId)),
    ]);

    return c.json({ volunteers, tasksCompleted: taskTotals.completed, tasksTotal: taskTotals.total });
  });

  return app;
}
