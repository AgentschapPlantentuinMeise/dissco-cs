import type { ClientErrorInput, ClientErrorKind } from '@dissco-cs/shared-types';
import { getBreadcrumbs, withoutQuery } from '../breadcrumbs';
import { getJwt } from '../jwt';
import { ApiError } from './request';
import { withQuery } from '../url';

/**
 * Whether the backend still has to hear about this error. A 4xx is an expected answer, and a 5xx
 * from our own backend is already logged there; a 5xx it never saw (nginx's 502/504, Madoc via
 * the login pages) and everything else (network failure, bug, render crash) has to be reported.
 * @param err any caught error
 * Returns: true when it should go to app_log.
 */
export function shouldReport(err: unknown): boolean {
  if (!(err instanceof ApiError)) {
    return true;
  }
  return err.status >= 500 && !err.loggedByBackend;
}

function siteSlug(): string | undefined {
  return window.location.pathname.match(/\/s\/([^/]+)/)?.[1];
}

/**
 * The one place a frontend error goes: the browser console, and app_log when the backend does not
 * know it yet (see shouldReport), with the page and the recent breadcrumbs. Fire-and-forget, never
 * throws. A raw fetch instead of csFetch: a 401 here must not redirect to login, and keepalive
 * lets the report through while the page is being left.
 * @param err the caught error
 * @param kind what failed (ClientErrorKind), e.g. 'action'
 * Who: anyone.
 * Returns: nothing.
 */
export function reportClientError(err: unknown, kind: ClientErrorKind): void {
  console.error(`[client-error] ${kind}`, err);
  if (!shouldReport(err)) {
    return;
  }

  const report: ClientErrorInput = {
    kind,
    message: (err instanceof Error ? err.message || err.name : String(err)).slice(0, 1000),
    stack: err instanceof Error ? err.stack?.slice(0, 4000) : undefined,
    url: withoutQuery(window.location.pathname).slice(0, 500),
    breadcrumbs: getBreadcrumbs(),
  };

  const jwt = getJwt();
  fetch(withQuery('/api/dissco-cs/client-errors', { slug: siteSlug() }), {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
    body: JSON.stringify(report),
  }).catch(() => {
    // Nowhere left to report a failed report to.
  });
}
