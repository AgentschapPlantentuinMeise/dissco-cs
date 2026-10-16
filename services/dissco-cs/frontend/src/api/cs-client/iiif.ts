import { csFetch } from './request';
import { getSiteSlug } from '../slug';
import { MadocCollectionSummaryDto, MadocManifestStructureDto } from '@dissco-cs/shared-types';

// The canvas JSON is not modeled: only getImageServiceId() reads into it, defensively.
export const iiifApi = {
  /**
   * One canvas (a single image of a manifest) from Madoc's public site API, passed through as is.
   * @param canvasId Madoc's canvas id (MadocManifestStructureDto.items[].id)
   * Who: anyone; Madoc decides what an anonymous visitor may see.
   * Returns: { canvas } as Madoc sends it; Madoc's status passed through unchanged.
   */
  getCanvas: (canvasId: number) => csFetch<{ canvas: unknown }>(`/iiif/canvases/${canvasId}?slug=${getSiteSlug()}`),

  /**
   * The canvases of a manifest, in order -- what the annotate page pages through.
   * @param manifestId Madoc's manifest id, from the URL
   * Who: anyone; Madoc decides what an anonymous visitor may see.
   * Returns: MadocManifestStructureDto; Madoc's status passed through unchanged.
   */
  getManifestStructure: (manifestId: number) =>
    csFetch<MadocManifestStructureDto>(`/iiif/manifests/${manifestId}/structure?slug=${getSiteSlug()}`),

  /**
   * Every top-level IIIF collection of the site that has items, also unpublished ones -- for the
   * bulk-create picker. The backend walks all of Madoc's pages.
   * Input: none.
   * Who: site admin.
   * Returns: MadocCollectionSummaryDto[].
   */
  listCollections: async () => (await csFetch<{ collections: MadocCollectionSummaryDto[] }>('/iiif/collections')).collections,

  /**
   * Sets the items of a collection: replaces the whole list, it does not add to it.
   * @param collectionId Madoc's collection id (e.g. a project's own collection, from
   *   projectsApi.getStructure)
   * @param itemIds the complete new list of manifest/collection ids, in order
   * Who: site admin.
   * Returns: nothing; Madoc's status passed through unchanged.
   */
  setCollectionStructure: (collectionId: number, itemIds: number[]) =>
    csFetch<void>(`/iiif/collections/${collectionId}/structure`, { method: 'PUT', body: JSON.stringify({ item_ids: itemIds }) }),
};
