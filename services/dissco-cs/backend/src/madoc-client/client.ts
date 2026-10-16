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
  // Sent as x-madoc-site-id: with the service token, Madoc needs it to know which site is meant.
  siteId?: number;
  query?: Record<string, string> | URLSearchParams;
  headers?: Record<string, string>;
}

/** A non-2xx answer from Madoc. Keeps Madoc's status and body, so a route can still pass them on. */
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

// ---- this backend's own calls to Madoc (service token) ----

// The service token may do everything in Madoc. Use it only for this backend's own work (stats,
// progress, stuck tasks, ...), never to carry out something a user asked for: Madoc would then
// skip its permission checks and credit the wrong person.

/**
 * Calls Madoc with the service token and returns the raw answer.
 * @param path the Madoc path, built with madocPath so every id is checked
 * @param req optional method, JSON body, siteId (which site is meant), query and headers
 * Returns: Madoc's Response, whatever its status.
 */
export function serviceFetch(path: string, req: MadocRequest = {}): Promise<Response> {
  return gatewayFetch(path, getServiceJwt(), req);
}

/**
 * Calls Madoc with the service token and reads the JSON answer.
 * @param path the Madoc path, built with madocPath so every id is checked
 * @param req optional method, JSON body, siteId (which site is meant), query and headers
 * Returns: the JSON body as T. Throws a MadocHttpError on a non-2xx answer.
 */
export async function serviceJson<T>(path: string, req: MadocRequest = {}): Promise<T> {
  return parseJsonOrThrow<T>(await serviceFetch(path, req), req.method, path);
}

// ---- passing on what a user does ----

// The frontend only talks to this backend. Everything a user or admin does in Madoc is passed on
// from here with that user's own token, so Madoc applies its own permission checks and credits
// the work to the right person.

/**
 * Calls Madoc with the user's own token and returns the raw answer.
 * @param path the Madoc path; every id in it must already be checked (validateParams)
 * @param userToken the user's token (requestBearerToken), or undefined for a visitor
 * @param init optional method and JSON body
 * Returns: Madoc's Response, whatever its status.
 */
export function madocFetch(
  path: string,
  userToken: string | undefined,
  init: { method?: string; body?: unknown } = {}
): Promise<Response> {
  return gatewayFetch(path, userToken, init);
}

/**
 * Like madocFetch, but reads the JSON answer -- for when this backend combines several answers
 * (e.g. every page of a list) instead of passing one on.
 * @param path the Madoc path; every id in it must already be checked
 * @param userToken the user's token, or undefined for a visitor
 * Returns: the JSON body as T. Throws a MadocHttpError on a non-2xx answer.
 */
export async function madocJson<T>(path: string, userToken: string | undefined): Promise<T> {
  return parseJsonOrThrow<T>(await madocFetch(path, userToken), 'GET', path);
}

/**
 * Turns a caught error into the answer for the browser: a MadocHttpError keeps Madoc's status and
 * body; any other error is thrown again, so app.onError logs it and answers 500.
 * @param err the caught error
 * Returns: the Response to send (only for a MadocHttpError).
 */
export function madocErrorResponse(err: unknown): Response {
  if (err instanceof MadocHttpError) {
    return new Response(err.body, { status: err.status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  throw err;
}

/**
 * Passes Madoc's answer on unchanged: same status, same body. The frontend relies on that, e.g.
 * on the 404 that prepare-claim gives when the user has no access, and on Madoc's own
 * `{ error }` messages. Some Madoc routes answer 201 with a plain-text "Created" instead of JSON:
 * a successful answer that is not JSON is sent on without body; a failed one is sent on as text.
 * @param response Madoc's answer (from madocFetch)
 * Returns: the Response to send to the browser.
 */
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

/**
 * Reads a request body that is passed on to Madoc without our own check (Madoc checks it).
 * Bodies we handle ourselves use validateJson(schema) instead.
 * @param c the request context
 * Returns: the parsed JSON, or a 400 Response to return when the body is not JSON.
 */
export async function readJsonBody(c: Context): Promise<unknown> {
  const body: unknown = await c.req.json().catch(() => undefined);
  return body === undefined ? c.json({ error: 'Invalid JSON' }, 400) : body;
}

/**
 * The usual write: passes the request's JSON body on to Madoc with the user's token, and passes
 * Madoc's answer back unchanged (relayMadocResponse).
 * @param c the request context
 * @param path the Madoc path; every id in it must already be checked
 * @param method POST, PUT or PATCH
 * @param userToken the user's token (requestBearerToken)
 * Returns: Madoc's answer, or 400 when the body is not JSON.
 */
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

/**
 * The path in Madoc's public API of a site (/s/:slug/madoc/api/...), for data that visitors who
 * are not logged in may see too. The site comes from the `slug` query parameter that every public
 * call from the frontend sends.
 * @param c the request context (its `slug` query parameter is used)
 * @param endpoint the part after /madoc/api, e.g. '/projects/12'
 * Returns: the full path, or null when the slug is missing or not safe.
 */
export function publicSitePath(c: Context, endpoint: string): string | null {
  const slug = c.req.query('slug');
  return isSafeSegment(slug) ? `/s/${slug}/madoc/api${endpoint}` : null;
}

/**
 * The request's query string without our own `slug` parameter, to pass filters on to Madoc.
 * @param c the request context
 * Returns: '?a=1&b=2', or '' when nothing is left.
 */
export function forwardQuery(c: Context): string {
  const params = new URLSearchParams(c.req.query());
  params.delete('slug');
  const query = params.toString();
  return query ? `?${query}` : '';
}
