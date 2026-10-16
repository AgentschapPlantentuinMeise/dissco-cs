import { MadocInternationalString } from './common.js';

// Payload shape of Madoc's admin collections-list endpoint (GET /api/madoc/iiif/collections).
export type MadocCollectionSummaryDto = {
  id: number;
  slug: string;
  label?: MadocInternationalString | string;
  itemCount?: number;
};

// One canvas (image) in a manifest's structure (GET /manifests/:id/structure), only the fields
// dissco-cs reads.
export type MadocManifestStructureItemDto = {
  id: number;
  label?: MadocInternationalString;
};

export type MadocManifestStructureDto = {
  items: MadocManifestStructureItemDto[];
};
