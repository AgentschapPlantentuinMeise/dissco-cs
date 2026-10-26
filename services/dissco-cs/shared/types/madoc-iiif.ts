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

// One label/value pair of a manifest's IIIF metadata, e.g. { label: { en: ['Date'] }, value: { none: ['1890'] } }.
// A value may hold a little HTML (IIIF allows <a>, <b>, <i>, ...).
export type MadocMetadataItemDto = {
  label: MadocInternationalString;
  value: MadocInternationalString;
};

// What the institution tells about a manifest, picked from Madoc's site manifest
// (GET /s/:slug/madoc/api/manifests/:id) -- the Info panel on the annotate page.
export type MadocManifestMetadataDto = {
  label: MadocInternationalString;
  summary?: MadocInternationalString;
  metadata: MadocMetadataItemDto[];
  // The attribution the institution requires, e.g. { label: { en: ['Attribution'] }, value: ... }.
  requiredStatement?: MadocMetadataItemDto;
};
