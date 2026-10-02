import { MadocInternationalString } from './common.js';

// One entry of a IIIF manifest's flat canvas structure (GET /manifests/:id/structure) --
// only the fields AnnotatePage/ImagePreviewPopup actually read.
export type MadocManifestStructureItemDto = {
  id: number;
  label?: MadocInternationalString;
};

export type MadocManifestStructureDto = {
  items: MadocManifestStructureItemDto[];
};
