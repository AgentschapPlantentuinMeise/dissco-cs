import { getJwt, redirectToExpiredLogin } from '../jwt';

// The one error type for every API call in the app. Lets callers branch on the status (e.g. 404 =
// missing site scope on prepare-claim, per madoc-ts's userWithScope, vs. a genuinely missing
// resource) instead of parsing the message string. `message` is the server's own message when it
// sent one (Madoc's `{ error }` JSON or a plain-text body), so it can be shown to the user.
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

export async function csFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const jwt = getJwt();

  const response = await fetch(`/api/dissco-cs${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...(init?.headers || {}),
    },
  });

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
