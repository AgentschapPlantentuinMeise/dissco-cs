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
import { MadocCrowdsourcingTaskDto, MadocPagination } from '@dissco-cs/shared-types';
import { getStuckMadocTasks, getStuckManifestCounters, resyncManifestTaskCounter, updateMadocTask } from '../madoc-client/tasks.js';
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

  app.get('/:taskId', validateParams({ taskId: safeSegment }), async c => {
    const { taskId } = c.req.valid('param');

    return relayMadocResponse(await madocFetch(`/api/tasks/${taskId}?all=true&detail=true`, requestBearerToken(c)));
  });

  app.patch('/:taskId', validateParams({ taskId: safeSegment }), async c => {
    const { taskId } = c.req.valid('param');

    return forwardJsonBody(c, `/api/tasks/${taskId}`, 'PATCH', requestBearerToken(c));
  });

  return app;
}
