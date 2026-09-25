import { InternationalString } from './madoc-project.js';

// One entry of a IIIF manifest's flat canvas structure (GET /manifests/:id/structure) --
// only the fields AnnotatePage/ImagePreviewPopup actually read.
export type ManifestStructureItem = {
  id: number;
  label?: InternationalString;
};

export type ManifestStructure = {
  items: ManifestStructureItem[];
};
