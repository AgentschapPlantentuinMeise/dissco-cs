import queryString from 'query-string';
import { getJwt } from './jwt';
import { getSiteSlug } from './slug';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};

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

  if (!response.ok) {
    throw new Error(`Madoc API request failed: ${response.status} ${path}`);
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

export const madocClient = {
  // -- publicRequest-based (site-scoped public reads) --
  getSiteProjects: (query?: { page?: number }) => publicRequest<any>('/projects', query),
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
  randomlyAssignedManifest: (projectId: string | number, body: { collectionId?: number } = {}) =>
    request<{ remainingTasks: number; manifest: number; claim: any }>(
      `/api/madoc/projects/${projectId}/random`,
      { method: 'POST', body: { ...body, type: 'manifest', claim: false } }
    ),
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
