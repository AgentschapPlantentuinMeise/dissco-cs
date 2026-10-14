import { Hono } from 'hono';

import { requestBearerToken, requireSiteAdmin } from '../auth/auth.js';
import { appConfig } from '../config.js';
import {
  forwardJsonBody,
  forwardQuery,
  madocErrorResponse,
  madocFetch,
  madocJson,
  relayMadocResponse,
} from '../madoc-client/client.js';
import { collectAllPages } from '../madoc-client/pagination.js';
import { isSafeSegment } from '../madoc-client/path-segment.js';
import { MadocCrowdsourcingTaskDto, MadocPagination } from '@dissco-cs/shared-types';
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
    if (identity instanceof Response) {
      return identity;
    }

    const [tasks, manifestCounters] = await Promise.all([
      getStuckMadocTasks(identity.siteId),
      getStuckManifestCounters(identity.siteId),
    ]);
    return c.json({ tasks, manifestCounters });
  });

  app.post('/manifests/:containerId/resync', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const containerId = c.req.param('containerId');
    if (!isSafeSegment(containerId)) {
      return c.text('Invalid task id', 400);
    }

    return c.json({ resynced: await resyncManifestTaskCounter(identity.siteId, containerId) });
  });

  app.post('/:taskId/release', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const taskId = c.req.param('taskId');
    if (!isSafeSegment(taskId)) {
      return c.text('Invalid task id', 400);
    }

    await updateMadocTask(identity.siteId, taskId, { status: -1, status_text: 'abandoned' });
    return c.json({ released: true });
  });

  // ---- the user's own tasks ----

  // With `all=true` this walks every page itself and returns `{ tasks }` (same as GET /projects);
  // otherwise it relays the requested page as-is.
  app.get('/', async c => {
    const userToken = requestBearerToken(c);
    if (c.req.query('all') !== 'true') {
      return relayMadocResponse(await madocFetch(`/api/tasks${forwardQuery(c)}`, userToken));
    }

    const query = new URLSearchParams(c.req.query());
    for (const ours of ['slug', 'all', 'page']) {
      query.delete(ours);
    }

    try {
      const tasks = await collectAllPages(async page => {
        query.set('page', String(page));
        const data = await madocJson<{ tasks: MadocCrowdsourcingTaskDto[]; pagination?: MadocPagination }>(
          `/api/tasks?${query}`,
          userToken
        );
        return { items: data.tasks, totalPages: data.pagination?.totalPages };
      }, appConfig.madocPageConcurrency);
      return c.json({ tasks });
    } catch (err) {
      return madocErrorResponse(err);
    }
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
