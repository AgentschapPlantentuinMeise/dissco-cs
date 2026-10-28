import { validator } from 'hono/validator';
import { z } from 'zod';

// Like validateJson, for a multipart body that carries files: the JSON part goes in the field
// "data" and is checked against the shared zod schema, the files are passed on as they are (their
// size and type are checked with checkUpload). The handler reads both with c.req.valid('form').

export type MultipartBody<T> = { data: T; files: Record<string, File> };

function parseJsonField(value: unknown): unknown {
  if (typeof value !== 'string') {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    // Not JSON: the schema below then rejects it with a 400 that says what is wrong.
    return undefined;
  }
}

/**
 * Middleware that validates the multipart field "data" (JSON) against a schema and collects the
 * file fields.
 * @param schema the shared zod schema for the JSON part
 * Returns: the middleware; 400 { error } naming the failing fields when "data" is missing or invalid.
 */
export function validateMultipart<T extends z.ZodType>(schema: T) {
  return validator('form', (form, c) => {
    const result = schema.safeParse(parseJsonField(form.data));
    if (!result.success) {
      return c.json({ error: z.prettifyError(result.error) }, 400);
    }

    const files: Record<string, File> = {};
    for (const [field, value] of Object.entries(form)) {
      if (value instanceof File) {
        files[field] = value;
      }
    }
    const body: MultipartBody<z.output<T>> = { data: result.data, files };
    return body;
  });
}
