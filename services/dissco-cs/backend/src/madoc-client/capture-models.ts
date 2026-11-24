import { serviceJson } from './client.js';
import { madocPath } from './path-segment.js';
import { MadocCaptureModelDto } from '@dissco-cs/shared-types';

// One entry of Madoc's capture model list (madoc-ts types/schemas/capture-model-snippet.ts),
// limited to the fields dissco-cs reads.
export type MadocCaptureModelSnippetDto = { id: string; label: string };

/**
 * The id and label of every project model of the site: the models Madoc made when a project was
 * created, not the copies it makes for each image (those have a derived_from). The label is the
 * label of the model's top structure; a copied project keeps the label of its source. Madoc only
 * returns the whole list (`_all`) to a caller with the site.admin scope, which the service token has.
 * Uses the service token.
 * @param siteId the site
 * Returns: MadocCaptureModelSnippetDto[].
 */
export function listMadocProjectModels(siteId: number): Promise<MadocCaptureModelSnippetDto[]> {
  return serviceJson('/api/madoc/crowdsourcing/model', { siteId, query: { _all: 'true' } });
}

/**
 * One capture model with its structure and document. Uses the service token.
 * @param siteId the site
 * @param modelId the model's id (e.g. MadocProjectDto.capture_model_id)
 * Returns: MadocCaptureModelDto. Throws a MadocHttpError (e.g. 404) when the model is not on this site.
 */
export function getMadocCaptureModel(siteId: number, modelId: string): Promise<MadocCaptureModelDto> {
  return serviceJson(madocPath`/api/madoc/crowdsourcing/model/${modelId}`, { siteId });
}
