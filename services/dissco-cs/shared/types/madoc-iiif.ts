import { MadocInternationalString } from './common.js';

// Payload shape of Madoc's admin collections-list endpoint (GET /api/madoc/iiif/collections).
export type MadocCollectionSummaryDto = {
  id: number;
  slug: string;
  label?: MadocInternationalString | string;
  itemCount?: number;
};

// One entry of a IIIF manifest's flat canvas structure (GET /manifests/:id/structure) --
// only the fields AnnotatePage/ImagePreviewPopup actually read.
export type MadocManifestStructureItemDto = {
  id: number;
  label?: MadocInternationalString;
};

export type MadocManifestStructureDto = {
  items: MadocManifestStructureItemDto[];
};
