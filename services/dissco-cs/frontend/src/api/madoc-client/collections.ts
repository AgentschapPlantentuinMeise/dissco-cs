import { publicRequest, request } from './request';

// -- Collections/canvases/manifests (site-scoped public API) --
export const getSiteCollection = (id: number, query?: Record<string, unknown>) =>
  publicRequest<any>(`/collections/${id}`, query);
export const getSiteCanvas = (id: number, query?: Record<string, unknown>) => publicRequest<any>(`/canvases/${id}`, query);
export const getManifestStructure = (id: number) => publicRequest<{ items: any[] }>(`/manifests/${id}/structure`);

// -- Collections (gated admin API) --
export type MadocCollectionSummary = { id: number; slug: string; label?: unknown; itemCount?: number };

// All top-level IIIF collections on the site, for the bulk-create manifest/collection picker --
// same gated route the admin "browse collections" page uses, so unpublished ones show up too.
// Empty collections (itemCount 0) are filtered out since linking them would be pointless.
export async function getAllAdminCollections(): Promise<MadocCollectionSummary[]> {
  const first = await request<{ collections: MadocCollectionSummary[]; pagination?: { totalPages?: number } }>(
    '/api/madoc/iiif/collections?page=0'
  );
  const totalPages = first?.pagination?.totalPages || 1;
  const collections = first?.collections || [];

  if (totalPages <= 1) {
    return collections.filter(c => c.itemCount !== 0);
  }

  // Fetch remaining pages in small batches instead of all at once -- with thousands of
  // collections this could otherwise fire thousands of concurrent fetches and hit the
  // browser's connection limit (net::ERR_INSUFFICIENT_RESOURCES).
  const BATCH_SIZE = 6;
  const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 1);

  for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
    const batch = remainingPages.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(page =>
        request<{ collections: MadocCollectionSummary[] }>(`/api/madoc/iiif/collections?page=${page}`)
      )
    );
    collections.push(...results.flatMap(page => page?.collections || []));
  }

  return collections.filter(c => c.itemCount !== 0);
}

// Full desired `item_ids` list for a project's flat collection -- this replaces the whole list
// (not an append), see update-collection-structure.ts in madoc-ts.
export const updateCollectionStructure = (collectionId: number, itemIds: number[]) =>
  request<void>(`/api/madoc/iiif/collections/${collectionId}/structure`, { method: 'PUT', body: { item_ids: itemIds } });
