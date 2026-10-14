import type { ClientErrorInput, ClientErrorKind } from '@dissco-cs/shared-types';
import { getBreadcrumbs, withoutQuery } from '../breadcrumbs';
import { getJwt } from '../jwt';
import { ApiError } from './request';

// An ApiError comes from our own backend, which already logged it (a 5xx) or answered as expected
// (a 4xx) -- reporting it again would only duplicate. Everything else (network failures, bugs,
// render crashes) the backend never saw.
export function shouldReport(err: unknown): boolean {
  return !(err instanceof ApiError);
}

function siteSlug(): string | undefined {
  return window.location.pathname.match(/\/s\/([^/]+)/)?.[1];
}

// The one place a frontend error goes: the browser console (for whoever is debugging) and, when
// the backend doesn't know about it yet, the backend's app_log. Fire-and-forget and never throws.
// Deliberately a raw fetch instead of csFetch: a 401 here must never redirect to the login page,
// and keepalive lets the report through even while the page is being left.
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
