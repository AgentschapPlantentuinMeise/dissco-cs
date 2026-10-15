import { Hono } from 'hono';

import { requestBearerToken } from '../auth/auth.js';
import { forwardJsonBody, madocFetch, relayMadocResponse } from '../madoc-client/client.js';
import { safeSegment, validateParams } from '../infrastructure/validate-params.js';

// Capture models and their revisions (a volunteer's saved annotations), forwarded to Madoc as the
// requesting user -- Madoc decides who may read or change which revision.
export function captureModelsController(): Hono {
  const app = new Hono();

  app.get('/revisions/:revisionId', validateParams({ revisionId: safeSegment }), async c => {
    const { revisionId } = c.req.valid('param');

    return relayMadocResponse(await madocFetch(`/api/madoc/crowdsourcing/revision/${revisionId}`, requestBearerToken(c)));
  });

  app.put('/revisions/:revisionId', validateParams({ revisionId: safeSegment }), async c => {
    const { revisionId } = c.req.valid('param');

    return forwardJsonBody(c, `/api/madoc/crowdsourcing/revision/${revisionId}`, 'PUT', requestBearerToken(c));
  });

  app.get('/:modelId', validateParams({ modelId: safeSegment }), async c => {
    const { modelId } = c.req.valid('param');

    return relayMadocResponse(await madocFetch(`/api/madoc/crowdsourcing/model/${modelId}`, requestBearerToken(c)));
  });

  app.post('/:modelId/revisions', validateParams({ modelId: safeSegment }), async c => {
    const { modelId } = c.req.valid('param');

    return forwardJsonBody(c, `/api/madoc/crowdsourcing/model/${modelId}/revision`, 'POST', requestBearerToken(c));
  });

  return app;
}
