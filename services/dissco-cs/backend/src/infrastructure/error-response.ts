import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

// app.onError: every error that reaches it becomes a JSON { error } answer, like every other error
// response of this API. An HTTPException (e.g. Hono's 400 for malformed JSON) keeps its own status;
// anything else is a 500, which the request-log middleware stores in app_log.
export function errorResponse(err: Error, c: Context): Response {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(`[http] ${c.req.method} ${c.req.path} failed`, err);
  return c.json({ error: 'Internal Server Error' }, 500);
}
