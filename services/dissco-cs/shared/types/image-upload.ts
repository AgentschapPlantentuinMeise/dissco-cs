import { z } from 'zod';

// The rules for an uploaded image (site images, institution logos).

export const MAX_IMAGE_UPLOAD_SIZE = 3_000_000;
// Formats every browser shows; also the file input's accept list. No SVG: it can hold a script,
// which would run on our own domain when someone opens the image's URL directly.
export const IMAGE_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const imageFileSchema = z
  .instanceof(File)
  .refine(f => f.size <= MAX_IMAGE_UPLOAD_SIZE, 'File too large')
  .refine(f => (IMAGE_UPLOAD_MIME_TYPES as readonly string[]).includes(f.type), 'Unsupported image type');
