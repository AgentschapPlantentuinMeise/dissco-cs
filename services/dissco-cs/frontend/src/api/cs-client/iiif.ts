import { csFetch, csFetchField } from './request';
import { urlPath, withSite } from '../url';
import { MadocCollectionSummaryDto, MadocManifestStructureDto } from '@dissco-cs/shared-types';

// The canvas JSON is not modeled: only getImageServiceId() reads into it, defensively.
export const iiifApi = {
  /**
   * One canvas (a single image of a manifest) from Madoc's public site API, passed through as is.
   * @param canvasId Madoc's canvas id (MadocManifestStructureDto.items[].id)
   * Who: anyone; Madoc decides what an anonymous visitor may see.
   * Returns: the canvas as Madoc sends it; Madoc's status passed through unchanged.
   */
  getCanvas: (canvasId: number) => csFetchField<unknown>(withSite(urlPath`/iiif/canvases/${canvasId}`), 'canvas'),

  /**
   * The canvases of a manifest, in order -- what the annotate page pages through.
   * @param manifestId Madoc's manifest id, from the URL
   * Who: anyone; Madoc decides what an anonymous visitor may see.
   * Returns: MadocManifestStructureDto; Madoc's status passed through unchanged.
   */
  getManifestStructure: (manifestId: number) =>
    csFetch<MadocManifestStructureDto>(withSite(urlPath`/iiif/manifests/${manifestId}/structure`)),

  /**
   * Every top-level IIIF collection of the site that has items, also unpublished ones -- for the
   * bulk-create picker. The backend walks all of Madoc's pages.
   * Input: none.
   * Who: site admin.
   * Returns: MadocCollectionSummaryDto[].
   */
  listCollections: () => csFetchField<MadocCollectionSummaryDto[]>('/iiif/collections', 'collections'),

  /**
   * Sets the items of a collection: replaces the whole list, it does not add to it.
   * @param collectionId Madoc's collection id (e.g. a project's own collection, from
   *   projectsApi.getStructure)
   * @param itemIds the complete new list of manifest/collection ids, in order
   * Who: site admin.
   * Returns: nothing; Madoc's status passed through unchanged.
   */
  setCollectionStructure: (collectionId: number, itemIds: number[]) =>
    csFetch<void>(urlPath`/iiif/collections/${collectionId}/structure`, { method: 'PUT', body: JSON.stringify({ item_ids: itemIds }) }),
};
