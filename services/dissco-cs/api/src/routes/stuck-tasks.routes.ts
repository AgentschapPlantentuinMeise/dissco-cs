import { Hono } from 'hono';

import { requireSiteAdmin } from '../jwt.js';
import { getStuckMadocTasks, getStuckManifestCounters, resyncManifestTaskCounter, updateMadocTask } from '../madoc-client.js';

// Site-brede lijst van vastzittende crowdsourcing-taken (status 0/1, nooit afgemaakt of
// losgelaten) — enige plek waar een sitebeheerder dit kan zien en oplossen, i.p.v. dat elke
// keer via een rechtstreekse databasequery te moeten uitzoeken.
export function stuckTasksRoutes(): Hono {
  const app = new Hono();

  app.get('/stuck-tasks', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) return identity;

    try {
      const [tasks, manifestCounters] = await Promise.all([
        getStuckMadocTasks(identity.siteId),
        getStuckManifestCounters(identity.siteId),
      ]);
      return c.json({ tasks, manifestCounters });
    } catch (err) {
      console.error('[stuck-tasks] fetch failed', { siteId: identity.siteId }, err);
      return c.text('Internal Server Error', 500);
    }
  });

  app.post('/stuck-tasks/:taskId/release', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) return identity;

    const taskId = c.req.param('taskId');
    try {
      await updateMadocTask(identity.siteId, taskId, { status: -1, status_text: 'abandoned' });
    } catch (err) {
      console.error('[stuck-tasks] release failed', { siteId: identity.siteId, taskId }, err);
      return c.text('Internal Server Error', 500);
    }

    return c.json({ released: true });
  });

  app.post('/stuck-tasks/manifests/:containerId/resync', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) return identity;

    const containerId = c.req.param('containerId');
    try {
      const resynced = await resyncManifestTaskCounter(identity.siteId, containerId);
      return c.json({ resynced });
    } catch (err) {
      console.error('[stuck-tasks] manifest resync failed', { siteId: identity.siteId, containerId }, err);
      return c.text('Internal Server Error', 500);
    }
  });

  return app;
}
