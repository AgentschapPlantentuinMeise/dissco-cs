import { csFetch } from './request';
import { getSiteSlug } from '../slug';
import { MadocCollectionSummaryDto, MadocManifestStructureDto } from '@dissco-cs/shared-types';

// IIIF collection/canvas JSON isn't modeled here -- nothing besides getImageServiceId() reaches
// into a canvas's structure, and that does its own narrow, defensive traversal.
export const iiifApi = {
  getCanvas: (canvasId: number) => csFetch<{ canvas: unknown }>(`/iiif/canvases/${canvasId}?slug=${getSiteSlug()}`),

  getManifestStructure: (manifestId: number) =>
    csFetch<MadocManifestStructureDto>(`/iiif/manifests/${manifestId}/structure?slug=${getSiteSlug()}`),

  // Admin: every non-empty top-level collection on the site (the backend walks the pages).
  listCollections: async () => (await csFetch<{ collections: MadocCollectionSummaryDto[] }>('/iiif/collections')).collections,

  // Replaces the collection's whole item list (not an append).
  setCollectionStructure: (collectionId: number, itemIds: number[]) =>
    csFetch<void>(`/iiif/collections/${collectionId}/structure`, { method: 'PUT', body: JSON.stringify({ item_ids: itemIds }) }),
};
