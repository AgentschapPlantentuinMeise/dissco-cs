import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SITE_PAGE_LANGS } from '@dissco-cs/shared-types';

import { isSafeSegment } from '../madoc-client/path-segment.js';

// Building blocks for validateParams: an id that goes into a Madoc URL (no '/', '..', etc.), a
// numeric id from our own database, and a content language.
export const safeSegment = z.string().refine(isSafeSegment, 'not a safe path segment');
export const intId = z.coerce.number().int();
// One of the site's content languages (nl/en/fr/de).
export const siteLang = z.enum(SITE_PAGE_LANGS);

// The path-param counterpart of validateJson: validates a route's params, the handler reads them
// typed with c.req.valid('param'). An invalid param answers 400 { error }.
export function validateParams<T extends z.ZodRawShape>(shape: T) {
  return zValidator('param', z.object(shape), (result, c) => {
    if (!result.success) {
      return c.json({ error: z.prettifyError(result.error) }, 400);
    }
  });
}
