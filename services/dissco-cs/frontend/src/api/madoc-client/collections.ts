import { publicRequest, request } from './request';

// -- Collections/canvases/manifests (site-scoped public API) --
export const getSiteCollection = (id: number, query?: Record<string, unknown>) =>
  publicRequest<any>(`/collections/${id}`, query);
export const getSiteCanvas = (id: number, query?: Record<string, unknown>) => publicRequest<any>(`/canvases/${id}`, query);
export const getManifestStructure = (id: number) => publicRequest<{ items: any[] }>(`/manifests/${id}/structure`);

// -- Collections (gated admin API) --
export type MadocCollectionSummary = { id: number; slug: string; label?: unknown };

// All top-level IIIF collections on the site, for the bulk-create manifest/collection picker --
// same gated route the admin "browse collections" page uses, so unpublished ones show up too.
export async function getAllAdminCollections(): Promise<MadocCollectionSummary[]> {
  const first = await request<{ collections: MadocCollectionSummary[]; pagination?: { totalPages?: number } }>(
    '/api/madoc/iiif/collections?page=0'
  );
  const totalPages = first?.pagination?.totalPages || 1;
  const collections = first?.collections || [];

  if (totalPages <= 1) {
    return collections;
  }

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      request<{ collections: MadocCollectionSummary[] }>(`/api/madoc/iiif/collections?page=${i + 1}`)
    )
  );

  return collections.concat(...rest.map(page => page?.collections || []));
}

// Full desired `item_ids` list for a project's flat collection -- this replaces the whole list
// (not an append), see update-collection-structure.ts in madoc-ts.
export const updateCollectionStructure = (collectionId: number, itemIds: number[]) =>
  request<void>(`/api/madoc/iiif/collections/${collectionId}/structure`, { method: 'PUT', body: { item_ids: itemIds } });
