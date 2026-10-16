import { Hono } from 'hono';

import { requestBearerToken, requireReviewerOrAdmin, requireUser } from '../auth/auth.js';
import { forwardJsonBody } from '../madoc-client/client.js';
import { getMadocReviewTasks } from '../madoc-client/reviews.js';
import { getMadocSiteUserRole } from '../madoc-client/users.js';
import { safeSegment, validateParams } from '../infrastructure/validate-params.js';

// Our own overview of all open review tasks of the site, with the assigned reviewer per task,
export function reviewController(): Hono {
  const app = new Hono();

  app.get('/is-reviewer', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const role = await getMadocSiteUserRole(identity.siteId, identity.userId);
    return c.json({ isReviewer: role === 'reviewer' });
  });

  app.get('/tasks', async c => {
    const identity = await requireReviewerOrAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    return c.json({ tasks: await getMadocReviewTasks(identity.siteId) });
  });

  // Goes through Madoc's crowdsourcing route on purpose, not the general task update
  // (PATCH /tasks/:taskId): on accept, only this route runs Madoc's extra checks -- for example,
  // it refuses while table cells are still flagged.
  app.patch('/tasks/:taskId', validateParams({ taskId: safeSegment }), async c => {
    const { taskId } = c.req.valid('param');

    return forwardJsonBody(c, `/api/madoc/crowdsourcing/task/${taskId}`, 'PATCH', requestBearerToken(c));
  });

  return app;
}
