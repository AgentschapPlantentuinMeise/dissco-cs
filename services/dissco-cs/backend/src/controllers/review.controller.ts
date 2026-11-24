import { Hono } from 'hono';

import { requestBearerToken, requireReviewerOrAdmin, requireUser } from '../auth/auth.js';
import { forwardJsonBody } from '../madoc-client/client.js';
import { fetchMadocReviewLookup } from '../madoc-client/reviews.js';
import { toReviewTaskListDto } from '../logic/review.logic.js';
import { getMadocSiteUserRole } from '../madoc-client/users.js';
import { safeSegment, validateParams } from '../infrastructure/validate-params.js';
import { passErrorOn } from '../infrastructure/request-log.js';
import { describeError } from '../infrastructure/describe-error.js';

// The review page: the open review tasks assigned to the caller, and accepting or releasing them.
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

    // A failed lookup for one project should not take the reviewer's whole list away: the list
    // comes back marked incomplete, and the error still reaches app_log through passErrorOn.
    const lookup = await fetchMadocReviewLookup(identity.siteId, identity.userId);
    if (lookup.errors.length > 0) {
      passErrorOn(c, new Error(`Review list incomplete: ${lookup.errors.length} lookup(s) failed; first: ${describeError(lookup.errors[0]).message}`));
    }
    return c.json(toReviewTaskListDto(lookup));
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
