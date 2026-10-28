import { Hono } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';

import { requestMadocUserIdentity, resolveSiteId } from '../auth/auth.js';
import { getClientIp } from '../infrastructure/rate-limit.js';
import { AppLogRepository } from '../repositories/app-log.repository.js';
import { clientErrorSchema } from '@dissco-cs/shared-types';

// This route is public on purpose: a crash for a visitor who is not logged in matters too. As a
// result, the user and site stored with a report are whatever the browser sends; nothing checks
// them. It always answers 204, even when a report is rejected, so a broken page never gets stuck
// re-sending its own failed reports.
export function clientErrorsController(appLog: AppLogRepository): Hono {
  const app = new Hono();

  const clientErrorRateLimit = rateLimiter({
    windowMs: 10 * 60 * 1000,
    limit: 20,
    keyGenerator: getClientIp,
    handler: c => c.body(null, 204),
  });

  app.post('/', clientErrorRateLimit, async c => {
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
