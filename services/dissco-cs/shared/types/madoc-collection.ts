import { MadocInternationalString } from './common.js';

// Payload shape of Madoc's admin collections-list endpoint (GET /api/madoc/iiif/collections).
export type MadocCollectionSummaryDto = {
  id: number;
  slug: string;
  label?: MadocInternationalString | string;
  itemCount?: number;
};
