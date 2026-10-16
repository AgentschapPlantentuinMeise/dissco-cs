import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HONOUR_BOARD_PERIODS, NAV_ITEM_CONTENT_KEYS, NAV_ITEM_KEYS, SITE_PAGE_LANGS } from '@dissco-cs/shared-types';

import { isSafeSegment } from '../madoc-client/path-segment.js';

// Building blocks for validateParams: an id or slug (no '/', '..', etc., so it is also safe in a
// Madoc URL), a numeric id from our own database, and the fixed lists below.
export const safeSegment = z.string().refine(isSafeSegment, 'not a safe path segment');
export const intId = z.coerce.number().int();
// One of the site's content languages (nl/en/fr/de).
export const siteLang = z.enum(SITE_PAGE_LANGS);
export const honourBoardPeriod = z.enum(HONOUR_BOARD_PERIODS);
export const navItemKey = z.enum(NAV_ITEM_KEYS);
export const navItemContentKey = z.enum(NAV_ITEM_CONTENT_KEYS);

// The path-param counterpart of validateJson: validates a route's params, the handler reads them
// typed with c.req.valid('param'). An invalid param answers 400 { error }.
export function validateParams<T extends z.ZodRawShape>(shape: T) {
  return zValidator('param', z.object(shape), (result, c) => {
    if (!result.success) {
      return c.json({ error: z.prettifyError(result.error) }, 400);
    }
  });
}
