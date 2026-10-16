import type { ClientErrorInput, ClientErrorKind } from '@dissco-cs/shared-types';
import { getBreadcrumbs, withoutQuery } from '../breadcrumbs';
import { getJwt } from '../jwt';
import { ApiError } from './request';

/**
 * Whether the backend still has to hear about this error. An ApiError came from our own backend,
 * which already logged it (5xx) or answered as expected (4xx); everything else (network failure,
 * bug, render crash) it never saw.
 * @param err any caught error
 * Returns: true when it should go to app_log.
 */
export function shouldReport(err: unknown): boolean {
  return !(err instanceof ApiError);
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
  const slug = siteSlug();
  fetch(`/api/dissco-cs/client-errors${slug ? `?slug=${slug}` : ''}`, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
    body: JSON.stringify(report),
  }).catch(() => {
    // Nowhere left to report a failed report to.
  });
}
