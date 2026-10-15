import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { intId, safeSegment, siteLang, validateParams } from '../../src/infrastructure/validate-params';

// A tiny app with one route per building block; each echoes the validated params.
function testApp() {
  const app = new Hono();
  app.get('/projects/:projectId', validateParams({ projectId: safeSegment }), c => c.json(c.req.valid('param')));
  app.get('/manuals/:manualId/:lang', validateParams({ manualId: intId, lang: siteLang }), c => c.json(c.req.valid('param')));
  return app;
}

describe('validateParams', () => {
  it('passes valid params through, typed', async () => {
    expect(await (await testApp().request('/projects/abc-123')).json()).toEqual({ projectId: 'abc-123' });
    expect(await (await testApp().request('/manuals/7/fr')).json()).toEqual({ manualId: 7, lang: 'fr' });
  });

  it('rejects a segment that could escape the Madoc path', async () => {
    // Hono decodes %2F to '/' in a param, so this is '..' + '/' + 'x' by the time it is validated.
    const res = await testApp().request('/projects/..%2Fx');
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe('string');
  });

  it('rejects a non-numeric id and an unknown language', async () => {
    expect((await testApp().request('/manuals/abc/fr')).status).toBe(400);
    expect((await testApp().request('/manuals/7/es')).status).toBe(400);
  });
});
