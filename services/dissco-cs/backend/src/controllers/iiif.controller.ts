import { Hono } from 'hono';

import { requestBearerToken, requireSiteAdmin } from '../auth/auth.js';
import { appConfig } from '../config.js';
import {
  forwardQuery,
  madocErrorResponse,
  madocFetch,
  madocJson,
  publicSitePath,
  relayMadocResponse,
} from '../madoc-client/client.js';
import { collectAllPages } from '../madoc-client/pagination.js';
import { isSafeSegment } from '../madoc-client/path-segment.js';
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

    // Madoc pages this list 5 at a time, so a site with thousands of collections means hundreds of
    // pages -- requested a few at once (madocPageConcurrency), not all concurrently.
    const userToken = requestBearerToken(c);
    try {
      const collections = await collectAllPages(async page => {
        const data = await madocJson<{ collections?: MadocCollectionSummaryDto[]; pagination?: MadocPagination }>(
          `/api/madoc/iiif/collections?page=${page}`,
          userToken
        );
        return { items: data.collections || [], totalPages: data.pagination?.totalPages };
      }, appConfig.madocPageConcurrency);
      return c.json({ collections: collections.filter(collection => collection.itemCount !== 0) });
    } catch (err) {
      return madocErrorResponse(err, '[iiif] list collections failed');
    }
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
