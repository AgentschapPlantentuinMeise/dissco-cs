import type { Context, MiddlewareHandler } from 'hono';

import { requestMadocUserIdentity } from '../auth/auth.js';
import { AppLogRepository } from '../repositories/app-log.repository.js';
import { describeError } from './describe-error.js';

declare module 'hono' {
  interface ContextVariableMap {
    passedOnError: unknown;
  }
}

// The one exception to "controllers don't log": a handler that catches an error on purpose and
// answers with its own 5xx (e.g. contact -> 502) hands the error over here instead of logging it.
export function passErrorOn(c: Context, err: unknown): void {
  c.set('passedOnError', err);
}

// The single place where requests and errors are logged:
// - every request: one line on stdout (method, path, status, duration, site, user)
// - every 5xx: one app_log row -- with the thrown error (Hono's onError leaves it on c.error) or
//   the one passed on, otherwise the start of the response body (e.g. a relayed Madoc failure).
// Site and user come from the JWT payload as it is: the gateway validates it, except on the
// public paths (see dissco-cs-api.conf), where it is only what the browser sent. Anonymous: the slug.
export function requestLog(appLog: AppLogRepository): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now();
    await next();

    const status = c.res.status;
    const identity = requestMadocUserIdentity(c);
    const who = identity ? `site=${identity.siteId} user=${identity.userId}` : `slug=${c.req.query('slug') ?? '-'}`;
    console.log(`[http] ${c.req.method} ${c.req.path} ${status} ${Date.now() - start}ms ${who}`);

    if (status < 500) {
      return;
    }

    const err = c.error ?? c.get('passedOnError');
    const described = err !== undefined
      ? describeError(err)
      : { message: `Responded with status ${status}`, stack: undefined };
    const details = err === undefined
      ? { body: (await c.res.clone().text().catch(() => '')).slice(0, 500) }
      : undefined;

    void appLog.record({
      level: 'error',
      source: 'backend',
      siteId: identity?.siteId,
      userId: identity?.userId,
      method: c.req.method,
      path: c.req.path,
      status,
      ...described,
      details,
    });
  };
}
