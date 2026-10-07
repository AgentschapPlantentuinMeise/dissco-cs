import { Hono } from 'hono';

import { requestBearerToken, requireSiteAdmin } from '../jwt.js';
import { forwardJsonBody, forwardQuery, isSafeSegment, madocFetch, relayMadocResponse } from '../madoc-client/client.js';
import { getStuckMadocTasks, getStuckManifestCounters, resyncManifestTaskCounter, updateMadocTask } from '../madoc-client/tasks.js';

// Crowdsourcing tasks: the user's own tasks (forwarded to tasks-api as that user, so it only ever
// returns what they may see) and the admin's site-wide stuck-task tools. `/stuck` is registered
// before `/:taskId` on purpose -- Hono matches in registration order.
export function tasksController(): Hono {
  const app = new Hono();

  // Site-wide list of stuck crowdsourcing tasks (status 0/1, never finished or abandoned) -- the
  // only place a site admin can see and fix these, instead of having to work it out through a
  // direct database query every time.
  app.get('/stuck', async c => {
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

  app.post('/manifests/:containerId/resync', async c => {
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

  app.post('/:taskId/release', async c => {
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

  // ---- the user's own tasks ----

  app.get('/', async c => {
    return relayMadocResponse(await madocFetch(`/api/tasks${forwardQuery(c)}`, requestBearerToken(c)));
  });

  app.get('/:taskId', async c => {
    const taskId = c.req.param('taskId');
    if (!isSafeSegment(taskId)) {
      return c.text('Invalid task id', 400);
    }

    return relayMadocResponse(await madocFetch(`/api/tasks/${taskId}?all=true&detail=true`, requestBearerToken(c)));
  });

  app.patch('/:taskId', async c => {
    const taskId = c.req.param('taskId');
    if (!isSafeSegment(taskId)) {
      return c.text('Invalid task id', 400);
    }

    return forwardJsonBody(c, `/api/tasks/${taskId}`, 'PATCH', requestBearerToken(c));
  });

  return app;
}
