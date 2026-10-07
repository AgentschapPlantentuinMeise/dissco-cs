import { Hono } from 'hono';

import { MadocUserIdentity, requestBearerToken, requireUser } from '../jwt.js';
import { forwardJsonBody, isSafeSegment } from '../madoc-client/client.js';
import { getMadocReviewTasks } from '../madoc-client/reviews.js';
import { getMadocSiteUserRole } from '../madoc-client/users.js';

// Zelfde voorwaarde als de frontend's is-reviewer-check: site-admins mogen altijd, anderen
// enkel als hun site-rol effectief 'reviewer' is.
export async function isReviewerOrAdmin(identity: MadocUserIdentity): Promise<boolean> {
  if (identity.scope.includes('site.admin')) return true;
  const role = await getMadocSiteUserRole(identity.siteId, identity.userId);
  return role === 'reviewer';
}

// Eigen reviewer-overzicht: alle site-brede taken die ter review staan, met de toegewezen
// reviewer als kolom -- i.p.v. Madoc's eigen /reviews-pagina.
export function reviewController(): Hono {
  const app = new Hono();

  app.get('/is-reviewer', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) return identity;

    try {
      const role = await getMadocSiteUserRole(identity.siteId, identity.userId);
      return c.json({ isReviewer: role === 'reviewer' });
    } catch (err) {
      console.error('[review] is-reviewer check failed', { siteId: identity.siteId, userId: identity.userId }, err);
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  });

  app.get('/tasks', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) return identity;

    if (!(await isReviewerOrAdmin(identity))) {
      return c.text('Forbidden', 403);
    }

    try {
      const tasks = await getMadocReviewTasks(identity.siteId);
      return c.json({ tasks });
    } catch (err) {
      console.error('[review] getMadocReviewTasks failed', { siteId: identity.siteId }, err);
      return c.text('Internal Server Error', 500);
    }
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
