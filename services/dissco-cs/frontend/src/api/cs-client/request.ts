import { addBreadcrumb, withoutQuery } from '../breadcrumbs';
import { getJwt, redirectToExpiredLogin } from '../jwt';

/**
 * The one error type of every API call. Callers branch on `status` (e.g. 404 on prepare-claim =
 * no access) instead of parsing text. `message` is the server's own `{ error }` text (ours or
 * Madoc's), for recognising a specific case and for the log -- never shown to the user.
 * `serverMessage` is that text alone, undefined when the server sent none (then `message` is a
 * technical fallback). `loggedByBackend` is false when the answer did not come from our backend
 * (a 502/504 page from nginx, or Madoc itself), so the browser has to report it (see shouldReport).
 */
export class ApiError extends Error {
  status: number;
  serverMessage: string | undefined;
  loggedByBackend: boolean;
  constructor(status: number, path: string, serverMessage?: string, loggedByBackend = true) {
    super(serverMessage || `DiSSCo CS API request failed: ${status} ${path}`);
    this.status = status;
    this.serverMessage = serverMessage || undefined;
    this.loggedByBackend = loggedByBackend;
  }
}

/**
 * Whether a failed call means "this thing does not exist" rather than "loading went wrong", so a
 * page can say "not found" instead of offering a retry.
 * @param error the error of a failed query or call, of any type
 * Returns: true only for an ApiError with status 404.
 */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

async function readServerMessage(response: Response): Promise<string | undefined> {
  const text = await response.text().catch(() => '');
  if (!text) {
    return undefined;
  }

  try {
    const data = JSON.parse(text);
    return typeof data?.error === 'string' ? data.error : text;
  } catch {
    return text;
  }
}

// Our backend answers every error with { error } JSON; anything else came from in front of it
// (nginx's 502/504 page, the dev proxy), and the backend never saw that request fail.
async function apiErrorFrom(response: Response, path: string): Promise<ApiError> {
  const fromBackend = (response.headers.get('content-type') || '').includes('application/json');
  return new ApiError(response.status, path, await readServerMessage(response), fromBackend);
}

function authHeader(): Record<string, string> {
  const jwt = getJwt();
  return jwt ? { Authorization: `Bearer ${jwt}` } : {};
}

async function sendRequest(path: string, init: RequestInit): Promise<Response> {
  const call = `${init.method ?? 'GET'} ${withoutQuery(path)}`;
  try {
    const response = await fetch(`/api/dissco-cs${path}`, init);
    addBreadcrumb('api', `${call} ${response.status}`);
    return response;
  } catch (err) {
    addBreadcrumb('api', `${call} network error`);
    throw err;
  }
}

async function readAnswer<T>(response: Response, path: string): Promise<T> {
  if (response.status === 401) {
    return redirectToExpiredLogin<T>();
  }

  if (!response.ok) {
    throw await apiErrorFrom(response, path);
  }

  // 204, and Madoc routes relayed by the backend that answer 201 without a JSON body.
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 204 || !contentType.includes('application/json')) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Calls our backend: adds the user's JWT and a breadcrumb, sends an expired session to the login
 * page, and throws an ApiError on any other non-2xx answer.
 * @param path the path after /api/dissco-cs, with its query
 * @param init optional fetch options (method, body, signal)
 * Returns: the JSON body as T; undefined for 204 or a non-JSON answer.
 */
export async function csFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await sendRequest(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(init?.headers || {}) },
  });
  return readAnswer<T>(response, path);
}

/**
 * Sends a multipart form (files and other fields) to our backend, with the user's JWT. No
 * Content-Type header: the browser sets it itself, with the multipart boundary in it.
 * @param path the path after /api/dissco-cs
 * @param method POST to create, PUT to replace
 * @param form the fields and files to send
 * Returns: like csFetch: the JSON body as T, undefined for 204; throws an ApiError on a non-2xx answer.
 */
export async function csSendForm<T>(path: string, method: 'POST' | 'PUT', form: FormData): Promise<T> {
  const response = await sendRequest(path, { method, headers: authHeader(), body: form });
  return readAnswer<T>(response, path);
}

/**
 * csFetch for an answer that is an object with one field, e.g. { announcements: [...] }: returns
 * that field. The backend keeps the object (so a field can be added later), the caller gets what
 * it needs.
 * @param path the path after /api/dissco-cs, with its query
 * @param field the one field of the answer, e.g. 'announcements'
 * @param init optional fetch options (method, body, signal)
 * Returns: the field's value as T. Throws an ApiError like csFetch.
 */
export async function csFetchField<T>(path: string, field: string, init?: RequestInit): Promise<T> {
  const data = await csFetch<Record<string, T>>(path, init);
  return data[field];
}
