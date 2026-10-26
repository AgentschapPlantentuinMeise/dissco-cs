import { z } from 'zod';

// The images a site admin can set in page management: the navbar logo, and the photo in the
// split-banner header of Home, Institutions and About.
export const SITE_IMAGE_KEYS = ['logo', 'home', 'institutions', 'about'] as const;
export type SiteImageKey = (typeof SITE_IMAGE_KEYS)[number];

// An image that is set. Keys without one are not listed.
export interface SiteImageDto {
  key: SiteImageKey;
  // Shown in the corner of a header photo; not used for the logo.
  credit: string | null;
  updatedAt: string;
}

export const MAX_SITE_IMAGE_SIZE = 3_000_000;
export const MAX_SITE_IMAGE_CREDIT_LENGTH = 200;
// Formats every browser shows; also the file input's accept list. No SVG: it can hold a script,
// which would run on our own domain when someone opens the image's URL directly.
export const SITE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const siteImageFileSchema = z
  .instanceof(File)
  .refine(f => f.size <= MAX_SITE_IMAGE_SIZE, 'File too large')
  .refine(f => (SITE_IMAGE_MIME_TYPES as readonly string[]).includes(f.type), 'Unsupported image type');

// An empty credit is stored as null, so the header shows none.
export const setSiteImageCreditSchema = z.strictObject({
  credit: z
    .string()
    .trim()
    .max(MAX_SITE_IMAGE_CREDIT_LENGTH)
    .nullable()
    .transform(credit => credit || null),
});
