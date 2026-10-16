import { Hono } from 'hono';

import { requestBearerToken, requireSiteAdmin } from '../auth/auth.js';
import { appConfig } from '../config.js';
import {
  forwardQuery,
  madocErrorResponse,
  madocFetch,
  madocJson,
  publicSitePath,
  readJsonBody,
  relayMadocResponse,
} from '../madoc-client/client.js';
import { collectAllPages } from '../madoc-client/pagination.js';
import { safeSegment, validateParams } from '../infrastructure/validate-params.js';
import { MadocCollectionSummaryDto, MadocPagination } from '@dissco-cs/shared-types';

// Only the IIIF descriptions (JSON) go through here. The images themselves do not: the viewer
// loads them directly from the image server.
export function iiifController(): Hono {
  const app = new Hono();

  // ---- public (Madoc's site API) ----

  app.get('/canvases/:canvasId', validateParams({ canvasId: safeSegment }), async c => {
    const { canvasId } = c.req.valid('param');
    const path = publicSitePath(c, `/canvases/${canvasId}${forwardQuery(c)}`);
    if (!path) {
      return c.json({ error: 'Invalid slug' }, 400);
    }

    return relayMadocResponse(await madocFetch(path, requestBearerToken(c)));
  });

  app.get('/manifests/:manifestId/structure', validateParams({ manifestId: safeSegment }), async c => {
    const { manifestId } = c.req.valid('param');
    const path = publicSitePath(c, `/manifests/${manifestId}/structure`);
    if (!path) {
      return c.json({ error: 'Invalid slug' }, 400);
    }

    return relayMadocResponse(await madocFetch(path, requestBearerToken(c)));
  });

  // ---- admin (gated Madoc API, forwarded as the admin) ----

  // Uses Madoc's admin-only collection list (the one behind Madoc's own collection browser),
  // because the public list leaves out unpublished collections.
  app.get('/collections', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    // Madoc returns this list 5 collections per page, so a big site has hundreds of pages. We fetch
    // a few pages at a time (madocPageConcurrency) instead of all at once, so Madoc is not flooded.
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
      return madocErrorResponse(err);
    }
  });

  app.put('/collections/:collectionId/structure', validateParams({ collectionId: safeSegment }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { collectionId } = c.req.valid('param');

    const body = await readJsonBody(c);
    if (body instanceof Response) {
      return body;
    }

    return relayMadocResponse(
      await madocFetch(`/api/madoc/iiif/collections/${collectionId}/structure`, requestBearerToken(c), { method: 'PUT', body })
    );
  });

  return app;
}
