import { csFetch } from './request';
import { urlPath } from '../url';
import { MadocCaptureModelDto, MadocCaptureModelRevisionRequestDto } from '@dissco-cs/shared-types';

// `status` (when given) overrides the revision's own status in the request body.
function withStatus(req: MadocCaptureModelRevisionRequestDto, status?: string): string {
  return JSON.stringify({ ...req, revision: { ...req.revision, status: status ?? req.revision.status } });
}

// All calls go to Madoc with the caller's own token: Madoc decides who may read or change what.
export const captureModelsApi = {
  /**
   * A capture model: the form structure and its document (field values).
   * @param modelId Madoc's capture model id (e.g. MadocPrepareClaimDto.model.id)
   * Who: logged-in user with access to the project.
   * Returns: MadocCaptureModelDto; Madoc's status passed through unchanged.
   */
  get: (modelId: string) => csFetch<MadocCaptureModelDto>(urlPath`/capture-models/${modelId}`),

  /**
   * Saves a volunteer's annotation as a revision of the model. Madoc updates the revision with the
   * same revision.id if it exists, so repeated saves of one task update one draft.
   * @param req captureModelId, the full document, and the revision (id, structureId, fields,
   *   status); passed on to Madoc unchecked
   * @param status optional: overrides req.revision.status ('draft' or 'submitted')
   * Who: the volunteer who claimed the task.
   * Returns: the saved revision; Madoc's status passed through unchanged.
   */
  createRevision: (req: MadocCaptureModelRevisionRequestDto, status?: string) =>
    csFetch<MadocCaptureModelRevisionRequestDto>(urlPath`/capture-models/${req.captureModelId}/revisions`, {
      method: 'POST',
      body: withStatus(req, status),
    }),

  /**
   * One revision with its document -- what a reviewer looks at.
   * @param revisionId Madoc's revision id
   * Who: the revision's author, or a reviewer of the project.
   * Returns: MadocCaptureModelRevisionRequestDto; Madoc's status passed through unchanged.
   */
  getRevision: (revisionId: string) =>
    csFetch<MadocCaptureModelRevisionRequestDto>(urlPath`/capture-models/revisions/${revisionId}`),

  /**
   * Changes an existing revision (e.g. a reviewer correcting values before accepting).
   * @param req the full revision request, as returned by getRevision, with the changes;
   *   passed on to Madoc unchecked
   * @param status optional: overrides req.revision.status
   * Who: the revision's author, or a reviewer of the project.
   * Returns: the updated revision; Madoc's status passed through unchanged.
   */
  updateRevision: (req: MadocCaptureModelRevisionRequestDto, status?: string) =>
    csFetch<MadocCaptureModelRevisionRequestDto>(urlPath`/capture-models/revisions/${req.revision.id}`, {
      method: 'PUT',
      body: withStatus(req, status),
    }),
};
