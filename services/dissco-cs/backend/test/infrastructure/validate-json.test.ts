import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { errorResponse } from '../../src/infrastructure/error-response';
import { validateJson } from '../../src/infrastructure/validate-json';

// A tiny app wired like app.ts: one validated route, plus the shared error handler.
function testApp() {
  const app = new Hono();
  app.onError(errorResponse);
  app.post('/items', validateJson(z.object({ title: z.string().min(1) })), c => c.json(c.req.valid('json'), 201));
  app.get('/boom', () => {
    throw new Error('unexpected');
  });
  return app;
}

const post = (body: string) =>
  testApp().request('/items', { method: 'POST', headers: { 'content-type': 'application/json' }, body });

describe('validateJson + errorResponse', () => {
  it('lets a valid body through, typed', async () => {
    const res = await post(JSON.stringify({ title: 'Hello' }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ title: 'Hello' });
  });

  it('answers 400 { error } naming the field when the schema fails', async () => {
    const res = await post(JSON.stringify({ title: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe('string');
    expect(body.error).toContain('title');
  });

  it('answers 400 { error } on malformed JSON -- not a 500', async () => {
    const res = await post('{');
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe('string');
  });

  it('turns an unexpected error into 500 { error }', async () => {
    const res = await testApp().request('/boom');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal Server Error' });
  });
});
