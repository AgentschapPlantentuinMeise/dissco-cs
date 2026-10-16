import { Hono } from 'hono';

import { requestMadocUserIdentity, resolveSiteId } from '../auth/auth.js';
import { getClientIp, isRateLimited } from '../infrastructure/rate-limit.js';
import { AppLogRepository } from '../repositories/app-log.repository.js';
import { clientErrorSchema } from '@dissco-cs/shared-types';

const CLIENT_ERROR_RATE_LIMIT = { maxAttempts: 20, windowMs: 10 * 60 * 1000 };

// This route is public on purpose: a crash for a visitor who is not logged in matters too. As a
// result, the user and site stored with a report are whatever the browser sends; nothing checks
// them. It always answers 204, even when a report is rejected, so a broken page never gets stuck
// re-sending its own failed reports.
export function clientErrorsController(appLog: AppLogRepository): Hono {
  const app = new Hono();

  app.post('/', async c => {
    if (isRateLimited(`client-errors:${getClientIp(c)}`, CLIENT_ERROR_RATE_LIMIT.maxAttempts, CLIENT_ERROR_RATE_LIMIT.windowMs)) {
      return c.body(null, 204);
    }

    const result = clientErrorSchema.safeParse(await c.req.json().catch(() => null));
    if (!result.success) {
      return c.body(null, 204);
    }

    const { kind, message, stack, url, breadcrumbs } = result.data;
    const identity = requestMadocUserIdentity(c);
    await appLog.record({
      level: 'error',
      source: 'frontend',
      siteId: identity?.siteId ?? (await resolveSiteId(c)) ?? undefined,
      userId: identity?.userId,
      path: url,
      message,
      stack,
      details: { kind, breadcrumbs },
    });

    return c.body(null, 204);
  });

  return app;
}
