import { InternationalString } from './madoc-project.js';

// Payload shape of Madoc's admin collections-list endpoint (GET /api/madoc/iiif/collections).
export type MadocCollectionSummary = {
  id: number;
  slug: string;
  label?: InternationalString | string;
  itemCount?: number;
};
