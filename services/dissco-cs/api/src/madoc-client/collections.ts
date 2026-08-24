import { appConfig } from '../config.js';
import { getServiceJwt } from './client.js';
import { getMadocTaskStats } from './tasks.js';

export async function getMadocCollectionStructure(
  siteId: number,
  collectionId: number
): Promise<{ items: unknown[] }> {
  const response = await fetch(`${appConfig.madocGatewayUrl}/api/madoc/iiif/collections/${collectionId}/structure`, {
    headers: {
      Authorization: `Bearer ${getServiceJwt()}`,
      'x-madoc-site-id': String(siteId),
    },
  });

  if (!response.ok) {
    throw new Error(`Madoc collection structure request failed with status ${response.status}`);
  }

  return response.json();
}

// The structure endpoint above doesn't include thumbnails -- that query only selects the
// 'label' metadata field. Thumbnails require fetching the collection itself (with snippets),
// paginated (24 per page) just like madoc-ts' own collection-browsing UI.
export async function getMadocCollectionManifestThumbnails(
  siteId: number,
  collectionId: number
): Promise<Map<number, string | undefined>> {
  const thumbnails = new Map<number, string | undefined>();
  let page = 1;
  let totalPages = 1;

  do {
    const query = new URLSearchParams({ type: 'manifest', page: String(page) });
    const response = await fetch(`${appConfig.madocGatewayUrl}/api/madoc/iiif/collections/${collectionId}?${query}`, {
      headers: {
        Authorization: `Bearer ${getServiceJwt()}`,
        'x-madoc-site-id': String(siteId),
      },
    });

    if (!response.ok) {
      throw new Error(`Madoc collection request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      collection: { items: Array<{ id: number; thumbnail?: string }> };
      pagination?: { totalPages?: number };
    };
    for (const item of data.collection.items) {
      thumbnails.set(item.id, item.thumbnail);
    }
    totalPages = data.pagination?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return thumbnails;
}

// Used by project-progress.routes.ts for the per-project progress bar (the site-wide total on
// the homepage is computed directly from the database instead, see site-task-totals.repository.ts).
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
