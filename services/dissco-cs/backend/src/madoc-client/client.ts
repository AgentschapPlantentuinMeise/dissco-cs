import { readFileSync } from 'fs';
import type { Context } from 'hono';

import { appConfig } from '../config.js';
import { isSafeSegment } from './path-segment.js';

// Read on every call on purpose: madoc-ts rewrites this file whenever the token stops being valid
// (see sync-jwt-requests.ts), and its own gateway/token.ts reads it the same way.
function getServiceJwt(): string {
  const jwtJsonString = readFileSync(appConfig.madocServiceJwtPath).toString('utf-8');
  return JSON.parse(jwtJsonString).token;
}

export interface MadocRequest {
  method?: string;
  body?: unknown;
  // Sent as x-madoc-site-id -- with the service JWT, Madoc needs it to know which site is meant.
  siteId?: number;
  query?: Record<string, string> | URLSearchParams;
  headers?: Record<string, string>;
}

// A non-2xx answer from Madoc, keeping its status and body so a controller can still pass them on.
export class MadocHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    method: string,
    path: string
  ) {
    super(`Madoc ${method} ${path} failed with status ${status}${body ? `: ${body.slice(0, 200)}` : ''}`);
    this.name = 'MadocHttpError';
  }
}

function gatewayFetch(path: string, token: string | undefined, req: MadocRequest = {}): Promise<Response> {
  const headers: Record<string, string> = { ...req.headers };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (req.siteId !== undefined) {
    headers['x-madoc-site-id'] = String(req.siteId);
  }
  if (req.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const query = req.query ? new URLSearchParams(req.query).toString() : '';

  return fetch(`${appConfig.madocGatewayUrl}${path}${query ? `?${query}` : ''}`, {
    method: req.method ?? 'GET',
    headers,
    body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
  });
}

async function parseJsonOrThrow<T>(response: Response, method: string | undefined, path: string): Promise<T> {
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new MadocHttpError(response.status, body, method ?? 'GET', path);
  }
  return response.json() as Promise<T>;
}

// ---- this backend's own calls to Madoc (service JWT) ----
//
// For this backend's own computations (stats, progress, stuck tasks, ...), never for forwarding
// something a user does. Build `path` with madocPath (path-segment.ts) so every id is validated.

export function serviceFetch(path: string, req: MadocRequest = {}): Promise<Response> {
  return gatewayFetch(path, getServiceJwt(), req);
}

export async function serviceJson<T>(path: string, req: MadocRequest = {}): Promise<T> {
  return parseJsonOrThrow<T>(await serviceFetch(path, req), req.method, path);
}

// ---- forwarding user-initiated calls to Madoc ----
//
// The frontend only ever talks to this backend; everything a user or admin does in Madoc is
// forwarded from here *as that user* (their own JWT), so Madoc applies its own permission checks
// and attributes contributions to the right person.

export function madocFetch(
  path: string,
  userToken: string | undefined,
  init: { method?: string; body?: unknown } = {}
): Promise<Response> {
  return gatewayFetch(path, userToken, init);
}

// For when this backend combines several answers (e.g. walking every page) instead of relaying one.
export async function madocJson<T>(path: string, userToken: string | undefined): Promise<T> {
  return parseJsonOrThrow<T>(await madocFetch(path, userToken), 'GET', path);
}

// Relays a MadocHttpError's status and body as-is; anything else is rethrown for app.onError
// (logged and stored centrally, see infrastructure/request-log.ts).
export function madocErrorResponse(err: unknown): Response {
  if (err instanceof MadocHttpError) {
    return new Response(err.body, { status: err.status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  throw err;
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

// A body that is passed on to Madoc unvalidated (Madoc validates it itself): the parsed JSON, or a
// 400 answer when it is not JSON. Bodies we handle ourselves use validateJson(schema) instead.
export async function readJsonBody(c: Context): Promise<unknown> {
  const body: unknown = await c.req.json().catch(() => undefined);
  return body === undefined ? c.json({ error: 'Invalid JSON' }, 400) : body;
}

// The common case for a write: forward the request's JSON body to `path` and relay the answer.
export async function forwardJsonBody(
  c: Context,
  path: string,
  method: 'POST' | 'PUT' | 'PATCH',
  userToken: string | undefined
): Promise<Response> {
  const body = await readJsonBody(c);
  if (body instanceof Response) {
    return body;
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
