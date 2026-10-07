import { Hono } from 'hono';

import { requestBearerToken } from '../jwt.js';
import { forwardJsonBody, isSafeSegment, madocFetch, relayMadocResponse } from '../madoc-client/client.js';

// Capture models and their revisions (a volunteer's saved annotations), forwarded to Madoc as the
// requesting user -- Madoc decides who may read or change which revision.
export function captureModelsController(): Hono {
  const app = new Hono();

  app.get('/revisions/:revisionId', async c => {
    const revisionId = c.req.param('revisionId');
    if (!isSafeSegment(revisionId)) {
      return c.text('Invalid revision id', 400);
    }

    return relayMadocResponse(await madocFetch(`/api/madoc/crowdsourcing/revision/${revisionId}`, requestBearerToken(c)));
  });

  app.put('/revisions/:revisionId', async c => {
    const revisionId = c.req.param('revisionId');
    if (!isSafeSegment(revisionId)) {
      return c.text('Invalid revision id', 400);
    }

    return forwardJsonBody(c, `/api/madoc/crowdsourcing/revision/${revisionId}`, 'PUT', requestBearerToken(c));
  });

  app.get('/:modelId', async c => {
    const modelId = c.req.param('modelId');
    if (!isSafeSegment(modelId)) {
      return c.text('Invalid model id', 400);
    }

    return relayMadocResponse(await madocFetch(`/api/madoc/crowdsourcing/model/${modelId}`, requestBearerToken(c)));
  });

  app.post('/:modelId/revisions', async c => {
    const modelId = c.req.param('modelId');
    if (!isSafeSegment(modelId)) {
      return c.text('Invalid model id', 400);
    }

    return forwardJsonBody(c, `/api/madoc/crowdsourcing/model/${modelId}/revision`, 'POST', requestBearerToken(c));
  });

  return app;
}
