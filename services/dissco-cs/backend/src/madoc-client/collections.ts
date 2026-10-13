import { serviceJson } from './client.js';
import { collectAllPages } from './pagination.js';
import { madocPath } from './path-segment.js';
import { getMadocTaskStats } from './tasks.js';
import { MadocPagination } from '@dissco-cs/shared-types';

export function getMadocCollectionStructure(siteId: number, collectionId: number): Promise<{ items: unknown[] }> {
  return serviceJson(madocPath`/api/madoc/iiif/collections/${collectionId}/structure`, { siteId });
}

// The structure endpoint above doesn't include thumbnails -- that query only selects the
// 'label' metadata field. Thumbnails require fetching the collection itself (with snippets),
// paginated (24 per page) just like madoc-ts' own collection-browsing UI.
export async function getMadocCollectionManifestThumbnails(
  siteId: number,
  collectionId: number
): Promise<Map<number, string | undefined>> {
  const items = await collectAllPages(async page => {
    const data = await serviceJson<{
      collection: { items: Array<{ id: number; thumbnail?: string }> };
      pagination?: MadocPagination;
    }>(madocPath`/api/madoc/iiif/collections/${collectionId}`, {
      siteId,
      query: { type: 'manifest', page: String(page) },
    });
    return { items: data.collection.items, totalPages: data.pagination?.totalPages };
  });

  return new Map(items.map(item => [item.id, item.thumbnail]));
}

// Used by projects.controller.ts (/:projectId/progress) for the per-project progress bar (the site-wide total on
// the homepage is computed directly from the database instead, see madoc-db/stats.repository.ts).
export async function getMadocProjectManifestsAndTaskStats(
  siteId: number,
  collectionId: number,
  taskId: string
): Promise<{
  manifestItems: Array<{ id: number; label: unknown; type?: string }>;
  taskStats: { statuses: Record<string, number>; total: number };
}> {
  const [structure, taskStats] = await Promise.all([
    getMadocCollectionStructure(siteId, collectionId),
    getMadocTaskStats(siteId, taskId),
  ]);

  // The structure endpoint doesn't filter by type -- it also returns nested sub-collections.
  const manifestItems = (structure.items as Array<{ id: number; label: unknown; type?: string }>).filter(
    item => item.type?.toLowerCase() === 'manifest'
  );

  return { manifestItems, taskStats };
}
