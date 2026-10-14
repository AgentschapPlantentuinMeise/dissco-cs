import { Hono } from 'hono';

import { requestMadocUserIdentity, resolveSiteId } from '../auth/auth.js';
import { getClientIp, isRateLimited } from '../infrastructure/rate-limit.js';
import { AppLogRepository } from '../repositories/app-log.repository.js';
import { clientErrorSchema } from '@dissco-cs/shared-types';

const CLIENT_ERROR_RATE_LIMIT = { maxAttempts: 20, windowMs: 10 * 60 * 1000 };

// Errors from the browser (crashes, failed actions) end up in the same app_log as the backend's.
// Public on purpose (see the gateway allowlist): a crash for an anonymous visitor counts too. That
// also means the user/site in the row are what the browser claims -- the gateway doesn't validate
// the JWT on this path. Always answers 204, also when rate-limited or invalid, so a broken page
// can't get into a loop over its own error reports.
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
