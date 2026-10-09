import { Hono } from 'hono';

import { requestBearerToken, requireSiteAdmin } from '../auth/auth.js';
import { forwardQuery, isSafeSegment, madocFetch, publicSitePath, relayMadocResponse } from '../madoc-client/client.js';
import { MadocCollectionSummaryDto, MadocPagination } from '@dissco-cs/shared-types';

// IIIF resources (canvases, manifests, collections), forwarded to Madoc as the requesting user.
// Image tiles themselves are not proxied -- the viewer loads those straight from the image server.
export function iiifController(): Hono {
  const app = new Hono();

  // ---- public (Madoc's site API) ----

  app.get('/canvases/:canvasId', async c => {
    const canvasId = c.req.param('canvasId');
    const path = isSafeSegment(canvasId) ? publicSitePath(c, `/canvases/${canvasId}${forwardQuery(c)}`) : null;
    if (!path) {
      return c.text('Invalid slug or canvas id', 400);
    }

    return relayMadocResponse(await madocFetch(path, requestBearerToken(c)));
  });

  app.get('/manifests/:manifestId/structure', async c => {
    const manifestId = c.req.param('manifestId');
    const path = isSafeSegment(manifestId) ? publicSitePath(c, `/manifests/${manifestId}/structure`) : null;
    if (!path) {
      return c.text('Invalid slug or manifest id', 400);
    }

    return relayMadocResponse(await madocFetch(path, requestBearerToken(c)));
  });

  // ---- admin (gated Madoc API, forwarded as the admin) ----

  // All top-level IIIF collections on the site, for the bulk-create picker -- same gated route the
  // admin "browse collections" page uses, so unpublished ones show up too. Empty collections
  // (itemCount 0) are left out since linking them would be pointless.
  app.get('/collections', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const userToken = requestBearerToken(c);
    const firstResponse = await madocFetch('/api/madoc/iiif/collections?page=0', userToken);
    if (!firstResponse.ok) {
      return relayMadocResponse(firstResponse);
    }

    const first = (await firstResponse.json()) as { collections?: MadocCollectionSummaryDto[]; pagination?: MadocPagination };
    const totalPages = first.pagination?.totalPages || 1;
    const collections = first.collections || [];

    // Remaining pages in small batches rather than all at once -- with thousands of collections,
    // firing every page concurrently would hammer Madoc for no benefit.
    const BATCH_SIZE = 6;
    const remainingPages = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => i + 1);

    try {
      for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
        const batch = remainingPages.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async page => {
            const response = await madocFetch(`/api/madoc/iiif/collections?page=${page}`, userToken);
            if (!response.ok) {
              throw new Error(`Madoc collections page ${page} failed with status ${response.status}`);
            }
            return (await response.json()) as { collections?: MadocCollectionSummaryDto[] };
          })
        );
        collections.push(...results.flatMap(page => page.collections || []));
      }
    } catch (err) {
      console.error('[iiif] list collections failed', err);
      return c.text('Internal Server Error', 500);
    }

    return c.json({ collections: collections.filter(collection => collection.itemCount !== 0) });
  });

  // Full desired `item_ids` list for a project's flat collection -- this replaces the whole list
  // (not an append), see update-collection-structure.ts in madoc-ts.
  app.put('/collections/:collectionId/structure', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const collectionId = c.req.param('collectionId');
    if (!isSafeSegment(collectionId)) {
      return c.text('Invalid collection id', 400);
    }

    const body = await c.req.json().catch(() => undefined);
    if (body === undefined) {
      return c.text('Invalid JSON', 400);
    }

    return relayMadocResponse(
      await madocFetch(`/api/madoc/iiif/collections/${collectionId}/structure`, requestBearerToken(c), { method: 'PUT', body })
    );
  });

  return app;
}
