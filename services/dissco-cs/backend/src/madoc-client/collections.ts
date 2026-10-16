import { serviceJson } from './client.js';
import { collectAllPages } from './pagination.js';
import { madocPath } from './path-segment.js';
import { getMadocTaskStats } from './tasks.js';
import { MadocPagination } from '@dissco-cs/shared-types';

/**
 * The items of a collection (manifests and sub-collections), in order, with only their labels.
 * Uses the service token.
 * @param siteId the site
 * @param collectionId Madoc's collection id
 * Returns: { items }. Throws a MadocHttpError when Madoc answers with an error.
 */
export function getMadocCollectionStructure(siteId: number, collectionId: number): Promise<{ items: unknown[] }> {
  return serviceJson(madocPath`/api/madoc/iiif/collections/${collectionId}/structure`, { siteId });
}

/**
 * The thumbnail of every manifest in a collection. The structure endpoint above has no
 * thumbnails, so this reads the collection itself, page by page (24 manifests per page, Madoc's
 * own page size). Uses the service token.
 * @param siteId the site
 * @param collectionId Madoc's collection id
 * Returns: manifest id -> thumbnail URL (undefined when a manifest has none).
 */
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

/**
 * The manifests of a project's collection, and how many of its tasks have each status -- what a
 * project's progress is computed from. Uses the service token.
 * @param siteId the site
 * @param collectionId the project's collection (MadocProjectDto.collection_id)
 * @param taskId the project's root task (MadocProjectDto.task_id)
 * Returns: manifestItems (manifests only, no sub-collections) and taskStats (status -> count, and
 *   the total).
 */
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
