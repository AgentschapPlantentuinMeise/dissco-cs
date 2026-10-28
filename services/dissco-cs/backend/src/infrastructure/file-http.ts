import { fileTypeFromBuffer } from 'file-type';
import type { Context, MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';

// Uploading and downloading a file over HTTP: the same steps for manual attachments and site images.

// Room for the multipart wrapping around the file (boundaries, field headers, the filename).
const MULTIPART_OVERHEAD = 64 * 1024;

export type Upload = { filename: string; mimeType: string; buffer: Buffer };

/**
 * Middleware that answers 413 as soon as the request body grows past the limit, before the body is
 * read into memory.
 * @param maxContentSize the most the route accepts in files and fields together, in bytes; the
 *   multipart wrapping is added on top
 * Returns: the middleware; 413 { error } when the body is too large.
 */
export function uploadLimit(maxContentSize: number): MiddlewareHandler {
  return bodyLimit({
    maxSize: maxContentSize + MULTIPART_OVERHEAD,
    onError: c => c.json({ error: 'File too large' }, 413),
  });
}

/**
 * The file type read from the file's content, not from what the browser reported.
 * @param buffer the file's bytes
 * @param allowed the accepted MIME types, e.g. MANUAL_ATTACHMENT_MIME_TYPES
 * Returns: the detected MIME type, or null when it is unknown or not in allowed.
 */
export async function detectFileType(buffer: Buffer, allowed: readonly string[]): Promise<string | null> {
  const type = await fileTypeFromBuffer(buffer);
  return type && allowed.includes(type.mime) ? type.mime : null;
}

/**
 * Reads the multipart field "file" and checks its size and type.
 * @param c the request context; put uploadLimit(maxFileSize) on the route before this
 * @param maxFileSize the largest accepted file, in bytes
 * @param allowed the accepted MIME types
 * Returns: the file with its detected type, or a Response: 400 no file, 413 too large, 415 type not allowed.
 */
export async function readUpload(c: Context, maxFileSize: number, allowed: readonly string[]): Promise<Upload | Response> {
  const body = await c.req.parseBody().catch(() => null);
  const file = body?.file;
  if (!(file instanceof File)) {
    return c.json({ error: 'Missing file' }, 400);
  }

  return checkUpload(c, file, maxFileSize, allowed);
}

/**
 * Checks one uploaded file's size and type, and reads it into memory.
 * @param c the request context, for the error answer
 * @param file a file from the multipart body
 * @param maxFileSize the largest accepted file, in bytes
 * @param allowed the accepted MIME types
 * Returns: the file with its detected type, or a Response: 413 too large, 415 type not allowed.
 */
export async function checkUpload(c: Context, file: File, maxFileSize: number, allowed: readonly string[]): Promise<Upload | Response> {
  if (file.size > maxFileSize) {
    return c.json({ error: 'File too large' }, 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = await detectFileType(buffer, allowed);
  if (!mimeType) {
    return c.json({ error: 'Unsupported file type' }, 415);
  }

  return { filename: file.name, mimeType, buffer };
}

/**
 * Answers with a stored file. nosniff stops a browser from guessing another type than the one we
 * checked at upload (e.g. running a file as HTML).
 * @param c the request context; set Content-Disposition on it first when the file must download
 * @param buffer the file's bytes
 * @param mimeType the type stored at upload
 * Returns: the response with the file as body.
 */
export function sendFile(c: Context, buffer: Buffer, mimeType: string): Response {
  c.header('Content-Type', mimeType);
  c.header('X-Content-Type-Options', 'nosniff');
  return c.body(new Uint8Array(buffer));
}
