import { Hono } from 'hono';

import { resolveSiteId } from '../jwt.js';
import { getMadocSiteTaskTotals, getMadocSiteVolunteerCount } from '../madoc-client/site-stats.js';

export function statsRoutes(): Hono {
  const app = new Hono();

  app.get('/', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const [volunteers, taskTotals] = await Promise.all([
      getMadocSiteVolunteerCount(siteId),
      getMadocSiteTaskTotals(siteId),
    ]);

    return c.json({ volunteers, tasksCompleted: taskTotals.completed, tasksTotal: taskTotals.total });
  });

  return app;
}
