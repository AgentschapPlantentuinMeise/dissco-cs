import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

// Validates a route's JSON body against its shared zod schema; the handler then reads the typed
// body with c.req.valid('json'). An invalid body answers 400 { error } naming the failing fields
// (for developers and the log -- the user only ever sees a translated message). Malformed JSON is
// rejected by Hono itself with an HTTPException(400), turned into the same shape by errorResponse.
export function validateJson<T extends z.ZodType>(schema: T) {
  return zValidator('json', schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: z.prettifyError(result.error) }, 400);
    }
  });
}
