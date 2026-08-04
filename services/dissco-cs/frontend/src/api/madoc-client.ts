import queryString from 'query-string';
import { getJwt, redirectToExpiredLogin } from './jwt';
import { getSiteSlug } from './slug';

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

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
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

  return response.json();
}

/** Site-scoped "public" API, served at /s/{slug}/madoc/api/... */
function publicRequest<T>(endpoint: string, query?: Record<string, unknown>): Promise<T> {
  const qs = query ? `?${queryString.stringify(query, { arrayFormat: 'comma' })}` : '';
  return request<T>(`/s/${getSiteSlug()}/madoc/api${endpoint}${qs}`);
}

/**
 * Site-scoped "public" API POST, served at /s/{slug}/madoc/api/...
 * Unlike request(), this surfaces the server's `{ error }` JSON message (e.g. "Incorrect
 * email or password") instead of a generic status-code string, since the auth pages that
 * use this need to show that message to the user.
 */
async function publicPost<T>(endpoint: string, body: unknown): Promise<T> {
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

export type InvitationResponse =
  | { expired: true }
  | { id: string; message: unknown; role: string; site_role: string };

export type SiteTerms = { id: string; createdAt: string; terms?: { markdown: string; text: string } };
export type TermsStatus = { hasTerms: boolean; hasAccepted: boolean };

export const madocClient = {
  // -- dissco-cs auth pages (register/login/forgot-password/set-password) --
  getInvitation: (code: string) => publicRequest<InvitationResponse>('/auth/invitation', { code }),
  // Existing, unmodified Madoc route - not part of the dissco-cs-auth.ts addition.
  getTerms: () => publicRequest<{ latest: SiteTerms | null }>('/terms'),
  register: (data: { name: string; email: string; capToken: string; code?: string; termsAccepted?: boolean }) =>
    publicPost<{ ok: true; emailSent: boolean }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    publicPost<{ user: { id: number; name: string }; terms: TermsStatus }>('/auth/login', data),
  forgotPassword: (data: { email: string }) => publicPost<{ ok: true }>('/auth/forgot-password', data),
  setPassword: (data: { c1: string; c2: string; password: string }) =>
    publicPost<{ user: { id: number; name: string } | null }>('/auth/set-password', data),
  checkReset: (data: { c1: string; c2: string }) => publicRequest<{ valid: boolean }>('/auth/check-reset', data),

  // -- publicRequest-based (site-scoped public reads) --
  getSiteProjects: (query?: { page?: number }) => publicRequest<any>('/projects', query),
  getAllSiteProjects: async (): Promise<any[]> => {
    const first = await publicRequest<any>('/projects', { page: 1 });
    const totalPages = first?.pagination?.totalPages || 1;
    const projects: any[] = first?.projects || [];

    if (totalPages <= 1) {
      return projects;
    }

    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => publicRequest<any>('/projects', { page: i + 2 }))
    );

    return projects.concat(...rest.map(page => page?.projects || []));
  },
  getSiteProject: (id: string | number) => publicRequest<any>(`/projects/${id}`),
  getSiteCollection: (id: number, query?: Record<string, unknown>) =>
    publicRequest<any>(`/collections/${id}`, query),
  getSiteCanvas: (id: number, query?: Record<string, unknown>) => publicRequest<any>(`/canvases/${id}`, query),
  getUserDetails: () => publicRequest<any>('/me'),
  getManifestStructure: (id: number) => publicRequest<{ items: any[] }>(`/manifests/${id}/structure`),

  // -- gated /api/madoc + /api/tasks (gateway auth_request) --
  getProject: (id: string | number) => request<any>(`/api/madoc/projects/${id}`),
  // Ensures the capture model for this claim's target (manifest/canvas) exists — creating it
  // by cloning the project's base model if needed — and returns its id. A plain model lookup
  // (GET .../models/:subject) only finds models that were already derived, which for a
  // manifest-level claim never happens until prepare-claim or claim has run at least once.
  prepareClaim: (projectId: string | number, claim: Record<string, unknown>) =>
    request<{ model: { id: string; label: string }; claim: any }>(`/api/madoc/projects/${projectId}/prepare-claim`, {
      method: 'POST',
      body: claim,
    }),
  createResourceClaim: (projectId: string | number, claim: Record<string, unknown>) =>
    request<{ claim: any }>(`/api/madoc/projects/${projectId}/claim`, { method: 'POST', body: claim }),
  // Verwijdert de eigen claim-taak volledig (i.p.v. 'm op status -1 te zetten) — bestaande
  // upstream madoc-ts-route, zie routes/projects/delete-resource-claim.ts.
  revokeResourceClaim: (projectId: string | number, claim: Record<string, unknown>) =>
    request<void>(`/api/madoc/projects/${projectId}/revoke-claim`, { method: 'POST', body: claim }),
  randomlyAssignedManifest: (projectId: string | number, body: { collectionId?: number } = {}) =>
    request<{ remainingTasks: number; manifest: number; claim: any }>(
      `/api/madoc/projects/${projectId}/random`,
      { method: 'POST', body: { ...body, type: 'manifest', claim: false } }
    ),
  acceptTerms: () => request<void>('/api/madoc/terms/accept', { method: 'POST' }),
  getCaptureModel: (id: string) => request<any>(`/api/madoc/crowdsourcing/model/${id}`),
  createCaptureModelRevision: (req: unknown, status?: string) =>
    request<any>(`/api/madoc/crowdsourcing/model/${(req as any).captureModelId}/revision`, {
      method: 'POST',
      body: { ...(req as any), revision: { ...(req as any).revision, status: status ?? (req as any).revision.status } },
    }),
  updateCaptureModelRevision: (req: unknown, status?: string) =>
    request<any>(`/api/madoc/crowdsourcing/revision/${(req as any).revision.id}`, {
      method: 'PUT',
      body: { ...(req as any), revision: { ...(req as any).revision, status: status ?? (req as any).revision.status } },
    }),
  getTasks: <T = any>(page?: number, query: Record<string, unknown> = {}) =>
    request<{ tasks: T[]; pagination: any }>(
      `/api/tasks?${queryString.stringify({ page: page || 1, ...query }, { arrayFormat: 'comma' })}`
    ),
  updateTask: (id: string, task: Record<string, unknown>) =>
    request<any>(`/api/tasks/${id}`, { method: 'PATCH', body: task }),
};
