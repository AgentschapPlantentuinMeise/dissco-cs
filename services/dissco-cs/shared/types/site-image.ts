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

export const MAX_SITE_IMAGE_CREDIT_LENGTH = 200;

// An empty credit is stored as null, so the header shows none.
export const setSiteImageCreditSchema = z.strictObject({
  credit: z
    .string()
    .trim()
    .max(MAX_SITE_IMAGE_CREDIT_LENGTH)
    .nullable()
    .transform(credit => credit || null),
});
