import { Hono } from 'hono';

import { MadocUserIdentity, requestBearerToken, requireUser } from '../auth/auth.js';
import { forwardJsonBody } from '../madoc-client/client.js';
import { isSafeSegment } from '../madoc-client/path-segment.js';
import { getMadocReviewTasks } from '../madoc-client/reviews.js';
import { getMadocSiteUserRole } from '../madoc-client/users.js';

// Same condition as the frontend's is-reviewer check: site admins always qualify, anyone else
// only when their site role is actually 'reviewer'.
export async function isReviewerOrAdmin(identity: MadocUserIdentity): Promise<boolean> {
  if (identity.scope.includes('site.admin')) return true;
  const role = await getMadocSiteUserRole(identity.siteId, identity.userId);
  return role === 'reviewer';
}

// Our own reviewer overview: every site-wide task up for review, with the assigned reviewer as a
// column -- instead of Madoc's own /reviews page.
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
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    if (!(await isReviewerOrAdmin(identity))) {
      return c.text('Forbidden', 403);
    }

    return c.json({ tasks: await getMadocReviewTasks(identity.siteId) });
  });

  // Accept/reject a submission, forwarded as the reviewer. Deliberately madoc-ts's own
  // crowdsourcing task route, not the generic tasks-api PATCH (/tasks/:taskId): it carries extra
  // domain logic on accept (e.g. blocking when table cells are flagged).
  app.patch('/tasks/:taskId', async c => {
    const taskId = c.req.param('taskId');
    if (!isSafeSegment(taskId)) {
      return c.text('Invalid task id', 400);
    }

    return forwardJsonBody(c, `/api/madoc/crowdsourcing/task/${taskId}`, 'PATCH', requestBearerToken(c));
  });

  return app;
}
