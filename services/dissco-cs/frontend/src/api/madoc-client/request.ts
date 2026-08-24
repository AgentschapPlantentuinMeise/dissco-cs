import queryString from 'query-string';
import { getJwt, redirectToExpiredLogin } from '../jwt';
import { getSiteSlug } from '../slug';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};

// Lets callers branch on the status (e.g. 404 = missing site scope, per madoc-ts's
// userWithScope, vs. a genuinely missing resource) instead of parsing the message string.
export class ApiError extends Error {
  status: number;
  constructor(status: number, path: string, serverMessage?: string) {
    super(serverMessage || `Madoc API request failed: ${status} ${path}`);
    this.status = status;
  }
}

/** Gated API request, served at /api/madoc + /api/tasks (gateway auth_request), with the logged-in user's JWT. */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const jwt = getJwt();

  const response = await fetch(path, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (response.status === 401) {
    return redirectToExpiredLogin<T>();
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, path, data.error);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  // Some madoc-ts routes (e.g. update-collection-structure) set a 201 status without setting a
  // JSON body, which leaves Koa to fill in the plain-text status message ("Created") instead --
  // response.json() would throw trying to parse that, so only parse when it's actually JSON.
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return undefined as T;
  }

  return response.json();
}

/** Site-scoped "public" API, served at /s/{slug}/madoc/api/... */
export function publicRequest<T>(endpoint: string, query?: Record<string, unknown>): Promise<T> {
  const qs = query ? `?${queryString.stringify(query, { arrayFormat: 'comma' })}` : '';
  return request<T>(`/s/${getSiteSlug()}/madoc/api${endpoint}${qs}`);
}

/**
 * Site-scoped "public" API POST, served at /s/{slug}/madoc/api/...
 * Unlike request(), this surfaces the server's `{ error }` JSON message (e.g. "Incorrect
 * email or password") instead of a generic status-code string, since the auth pages that
 * use this need to show that message to the user.
 */
export async function publicPost<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`/s/${getSiteSlug()}/madoc/api${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return response.json();
}
