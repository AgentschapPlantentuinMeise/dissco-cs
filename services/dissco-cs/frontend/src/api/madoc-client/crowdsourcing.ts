import { request } from './request';
import {
  MadocPrepareClaimDto,
  MadocCreateResourceClaimDto,
  MadocRandomManifestDto,
  MadocCaptureModelDto,
  MadocCaptureModelRevisionRequestDto,
} from '@dissco-cs/shared-types';

// -- Resource claims + capture models/revisions (gated /api/madoc, gateway auth_request) --

// Ensures the capture model for this claim's target (manifest/canvas) exists — creating it
// by cloning the project's base model if needed — and returns its id. A plain model lookup
// (GET .../models/:subject) only finds models that were already derived, which for a
// manifest-level claim never happens until prepare-claim or claim has run at least once.
export const prepareClaim = (projectId: string | number, claim: Record<string, unknown>) =>
  request<MadocPrepareClaimDto>(`/api/madoc/projects/${projectId}/prepare-claim`, {
    method: 'POST',
    body: claim,
  });

export const createResourceClaim = (projectId: string | number, claim: Record<string, unknown>) =>
  request<MadocCreateResourceClaimDto>(`/api/madoc/projects/${projectId}/claim`, { method: 'POST', body: claim });

// Verwijdert de eigen claim-taak volledig (i.p.v. 'm op status -1 te zetten) — bestaande
// upstream madoc-ts-route, zie routes/projects/delete-resource-claim.ts.
export const revokeResourceClaim = (projectId: string | number, claim: Record<string, unknown>) =>
  request<void>(`/api/madoc/projects/${projectId}/revoke-claim`, { method: 'POST', body: claim });

export const randomlyAssignedManifest = (projectId: string | number, body: { collectionId?: number } = {}) =>
  request<MadocRandomManifestDto>(`/api/madoc/projects/${projectId}/random`, {
    method: 'POST',
    body: { ...body, type: 'manifest', claim: false },
  });

export const acceptTerms = () => request<void>('/api/madoc/terms/accept', { method: 'POST' });
export const getCaptureModel = (id: string) => request<MadocCaptureModelDto>(`/api/madoc/crowdsourcing/model/${id}`);

export const createCaptureModelRevision = (req: MadocCaptureModelRevisionRequestDto, status?: string) =>
  request<MadocCaptureModelRevisionRequestDto>(`/api/madoc/crowdsourcing/model/${req.captureModelId}/revision`, {
    method: 'POST',
    body: { ...req, revision: { ...req.revision, status: status ?? req.revision.status } },
  });

export const updateCaptureModelRevision = (req: MadocCaptureModelRevisionRequestDto, status?: string) =>
  request<MadocCaptureModelRevisionRequestDto>(`/api/madoc/crowdsourcing/revision/${req.revision.id}`, {
    method: 'PUT',
    body: { ...req, revision: { ...req.revision, status: status ?? req.revision.status } },
  });

export const getCaptureModelRevision = (id: string) =>
  request<MadocCaptureModelRevisionRequestDto>(`/api/madoc/crowdsourcing/revision/${id}`);

// Bewust niet updateTask() (die gaat naar de generieke /api/tasks/:id van de losse
// tasks-api) -- deze madoc-ts-eigen route bevat extra domeinlogica bij het accepteren van
// een inzending (o.a. blokkade bij gemarkeerde tabel-cellen).
export const updateRevisionTask = (taskId: string, task: Record<string, unknown>) =>
  request<void>(`/api/madoc/crowdsourcing/task/${taskId}`, { method: 'PATCH', body: { task } });
