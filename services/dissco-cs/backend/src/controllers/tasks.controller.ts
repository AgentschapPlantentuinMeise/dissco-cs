import { Hono } from 'hono';

import { requestBearerToken, requireSiteAdmin, requireUser } from '../auth/auth.js';
import { forwardJsonBody, forwardQuery, madocFetch, relayMadocResponse } from '../madoc-client/client.js';
import {
  getMadocUserTasks,
  getStuckMadocTasks,
  getStuckManifestCounters,
  resyncManifestTaskCounter,
  updateMadocTask,
} from '../madoc-client/tasks.js';
import { toMyTask } from '../logic/tasks.logic.js';
import { markProgressStaleAfter } from '../services/project-progress.service.js';
import { safeSegment, validateParams } from '../infrastructure/validate-params.js';

// /stuck is registered before /:taskId on purpose: Hono tries routes in the order they are
// registered, so otherwise /:taskId would treat 'stuck' as a task id.
export function tasksController(): Hono {
  const app = new Hono();

  app.get('/stuck', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const [tasks, manifestCounters] = await Promise.all([
      getStuckMadocTasks(identity.siteId),
      getStuckManifestCounters(identity.siteId),
    ]);
    return c.json({ tasks, manifestCounters });
  });

  app.post('/manifests/:containerId/resync', validateParams({ containerId: safeSegment }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { containerId } = c.req.valid('param');

    return c.json({ resynced: await resyncManifestTaskCounter(identity.siteId, containerId) });
  });

  app.post('/:taskId/release', validateParams({ taskId: safeSegment }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { taskId } = c.req.valid('param');

    await updateMadocTask(identity.siteId, taskId, { status: -1, status_text: 'abandoned' });
    return c.json({ released: true });
  });

  // ---- the user's own tasks ----

  app.get('/', async c => {
    return relayMadocResponse(await madocFetch(`/api/tasks${forwardQuery(c)}`, requestBearerToken(c)));
  });

  // Registered before /:taskId, which would otherwise take 'mine' for a task id.
  app.get('/mine', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const tasks = await getMadocUserTasks(identity.siteId, identity.userId);
    return c.json({ tasks: tasks.map(toMyTask) });
  });

  app.get('/:taskId', validateParams({ taskId: safeSegment }), async c => {
    const { taskId } = c.req.valid('param');

    return relayMadocResponse(await madocFetch(`/api/tasks/${taskId}?all=true&detail=true`, requestBearerToken(c)));
  });

  app.patch('/:taskId', validateParams({ taskId: safeSegment }), async c => {
    const { taskId } = c.req.valid('param');

    const response = await forwardJsonBody(c, `/api/tasks/${taskId}`, 'PATCH', requestBearerToken(c));
    // Status 2: the volunteer submitted the task.
    await markProgressStaleAfter(c, response, 2);
    return response;
  });

  return app;
}
