import { csFetch } from './request';
import { MadocCaptureModelDto, MadocCaptureModelRevisionRequestDto } from '@dissco-cs/shared-types';

// `status` (when given) overrides the revision's own status in the request body.
function withStatus(req: MadocCaptureModelRevisionRequestDto, status?: string): string {
  return JSON.stringify({ ...req, revision: { ...req.revision, status: status ?? req.revision.status } });
}

export const captureModelsApi = {
  get: (modelId: string) => csFetch<MadocCaptureModelDto>(`/capture-models/${modelId}`),

  createRevision: (req: MadocCaptureModelRevisionRequestDto, status?: string) =>
    csFetch<MadocCaptureModelRevisionRequestDto>(`/capture-models/${req.captureModelId}/revisions`, {
      method: 'POST',
      body: withStatus(req, status),
    }),

  getRevision: (revisionId: string) =>
    csFetch<MadocCaptureModelRevisionRequestDto>(`/capture-models/revisions/${revisionId}`),

  updateRevision: (req: MadocCaptureModelRevisionRequestDto, status?: string) =>
    csFetch<MadocCaptureModelRevisionRequestDto>(`/capture-models/revisions/${req.revision.id}`, {
      method: 'PUT',
      body: withStatus(req, status),
    }),
};
