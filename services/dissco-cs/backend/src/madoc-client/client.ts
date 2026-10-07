import { readFileSync } from 'fs';
import type { Context } from 'hono';

import { appConfig } from '../config.js';

export function getServiceJwt(): string {
  const jwtJsonString = readFileSync(appConfig.madocServiceJwtPath).toString('utf-8');
  return JSON.parse(jwtJsonString).token;
}

// ---- forwarding user-initiated calls to Madoc ----
//
// The frontend only ever talks to this backend; everything a user or admin does in Madoc is
// forwarded from here *as that user* (their own JWT), so Madoc applies its own permission checks
// and attributes contributions to the right person. The service JWT above is only for this
// backend's own computations (stats, progress, stuck tasks, ...), never for forwarding.

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

// Every value interpolated into a Madoc path must pass this first, so a crafted id (e.g. `..`)
// can never reach a different Madoc route than the one the handler intends.
export function isSafeSegment(value: string | undefined): value is string {
  return typeof value === 'string' && SAFE_SEGMENT.test(value);
}

export async function madocFetch(
  path: string,
  userToken: string | undefined,
  init: { method?: string; body?: unknown } = {}
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (userToken) {
    headers.Authorization = `Bearer ${userToken}`;
  }
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${appConfig.madocGatewayUrl}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

// Passes Madoc's status code and body through unchanged, so the frontend can still branch on
// e.g. a 404 (missing site scope on prepare-claim) or show Madoc's own `{ error }` message. Some
// madoc-ts routes set 201 without a JSON body (Koa then fills in plain-text "Created") -- a
// successful non-JSON body is dropped, a failed one is passed on as text.
export async function relayMadocResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get('content-type') ?? '';

  if (response.status === 204) {
    return new Response(null, { status: 204 });
  }

  if (contentType.includes('application/json')) {
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!response.ok) {
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response(null, { status: response.status });
}

// The common case for a write: forward the request's JSON body to `path` and relay the answer.
export async function forwardJsonBody(
  c: Context,
  path: string,
  method: 'POST' | 'PUT' | 'PATCH',
  userToken: string | undefined
): Promise<Response> {
  const body = await c.req.json().catch(() => undefined);
  if (body === undefined) {
    return c.text('Invalid JSON', 400);
  }

  return relayMadocResponse(await madocFetch(path, userToken, { method, body }));
}

// Madoc's site-scoped public API (/s/:slug/madoc/api/...), for data anonymous visitors may see.
// The site comes from the `slug` query param every public dissco-cs call already sends.
export function publicSitePath(c: Context, endpoint: string): string | null {
  const slug = c.req.query('slug');
  return isSafeSegment(slug) ? `/s/${slug}/madoc/api${endpoint}` : null;
}

// The incoming query string minus our own `slug` param, for passing filters on to Madoc as-is.
export function forwardQuery(c: Context): string {
  const params = new URLSearchParams(c.req.query());
  params.delete('slug');
  const query = params.toString();
  return query ? `?${query}` : '';
}
