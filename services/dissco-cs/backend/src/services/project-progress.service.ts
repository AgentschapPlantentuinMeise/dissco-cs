import type { Context } from 'hono';
import { resolveSiteId } from '../auth/auth.js';
import { caches } from '../infrastructure/cache/caches.js';
import { readJsonBody } from '../madoc-client/client.js';

/**
 * After a task write that changes a project's numbers (submitting, releasing in review), marks the
 * cached project progress stale, so the next card shows the new numbers. Only when Madoc accepted
 * the write and the body set the given status. The route only knows the task id, not its project,
 * so every project of the site is marked: finding the project would cost an extra Madoc call.
 * @param c the request context; its JSON body was already read by forwardJsonBody (Hono keeps it)
 * @param response Madoc's answer to the write
 * @param status the task status that changes the numbers (2 submitted, -1 released)
 * Returns: nothing.
 */
export async function markProgressStaleAfter(c: Context, response: Response, status: number): Promise<void> {
  if (!response.ok) {
    return;
  }
  const body = await readJsonBody(c);
  if (typeof body !== 'object' || body === null || body instanceof Response || (body as { status?: unknown }).status !== status) {
    return;
  }
  const siteId = await resolveSiteId(c);
  if (siteId !== null) {
    caches.projectProgress.markStale(siteId);
  }
}
