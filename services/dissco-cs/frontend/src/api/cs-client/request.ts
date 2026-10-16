import { addBreadcrumb, withoutQuery } from '../breadcrumbs';
import { getJwt, redirectToExpiredLogin } from '../jwt';

/**
 * The one error type of every API call. Callers branch on `status` (e.g. 404 on prepare-claim =
 * no access) instead of parsing text. `message` is the server's own `{ error }` text (ours or
 * Madoc's), for recognising a specific case and for the log -- never shown to the user.
 */
export class ApiError extends Error {
  status: number;
  constructor(status: number, path: string, serverMessage?: string) {
    super(serverMessage || `DiSSCo CS API request failed: ${status} ${path}`);
    this.status = status;
  }
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

/**
 * Calls our backend: adds the user's JWT and a breadcrumb, sends an expired session to the login
 * page, and throws an ApiError on any other non-2xx answer.
 * @param path the path after /api/dissco-cs, with its query
 * @param init optional fetch options (method, body, signal)
 * Returns: the JSON body as T; undefined for 204 or a non-JSON answer.
 */
export async function csFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const jwt = getJwt();
  const call = `${init?.method ?? 'GET'} ${withoutQuery(path)}`;

  let response: Response;
  try {
    response = await fetch(`/api/dissco-cs${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        ...(init?.headers || {}),
      },
    });
  } catch (err) {
    addBreadcrumb('api', `${call} network error`);
    throw err;
  }
  addBreadcrumb('api', `${call} ${response.status}`);

  if (response.status === 401) {
    return redirectToExpiredLogin<T>();
  }

  if (!response.ok) {
    throw new ApiError(response.status, path, await readServerMessage(response));
  }

  // 204, and Madoc routes relayed by the backend that answer 201 without a JSON body.
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 204 || !contentType.includes('application/json')) {
    return undefined as T;
  }

  return response.json();
}
