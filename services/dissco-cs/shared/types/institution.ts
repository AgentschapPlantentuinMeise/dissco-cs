import { z } from 'zod';
import { MultilingualText, multilingualTextSchema, emailSchema } from './common.js';

export type InstitutionDto = {
  id: number;
  slug: string;
  name: MultilingualText;
  description: MultilingualText;
  email: string | null;
  phone: string | null;
  website: string | null;
  // When the logo was last replaced, null when there is none; the logo's URL carries it, so a new
  // logo gets a new URL (institutionsApi.logoUrl).
  logoUpdatedAt: string | null;
  isActive: boolean;
  sortOrder: number;
};

export const MAX_INSTITUTION_NAME_LENGTH = 200;
export const MAX_INSTITUTION_DESCRIPTION_LENGTH = 2_000;
export const MAX_INSTITUTION_PHONE_LENGTH = 30;
export const MAX_INSTITUTION_WEBSITE_LENGTH = 255;
// The slug is made from the name (slugify only drops characters), plus "-2", "-3"... when it is
// taken; a little more room than the name.
export const MAX_INSTITUTION_SLUG_LENGTH = 255;

// Deliberately permissive (digits, spaces and + - ( ) . /): a stricter check once rejected Belgian
// notation such as 02/123 45 67.
const PHONE_CHARS_REGEX = /^[0-9+\-\s().\/]+$/;

// The multipart field that carries the logo, next to the field "data" with institutionInputSchema.
export const INSTITUTION_LOGO_FIELD = 'logo';

// The logo is not in here: it is a file next to this JSON (INSTITUTION_LOGO_FIELD), checked with
// imageFileSchema.
export const institutionInputSchema = z.object({
  name: multilingualTextSchema(true, MAX_INSTITUTION_NAME_LENGTH),
  description: multilingualTextSchema(true, MAX_INSTITUTION_DESCRIPTION_LENGTH),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .min(1, 'Phone is required')
    .max(MAX_INSTITUTION_PHONE_LENGTH)
    .regex(PHONE_CHARS_REGEX, 'Invalid characters in phone number')
    .refine(v => (v.match(/\d/g) ?? []).length >= 6, 'Phone number is too short'),
  website: z.string().trim().min(1, 'Website is required').max(MAX_INSTITUTION_WEBSITE_LENGTH),
  isActive: z.boolean(),
});

export type InstitutionInput = z.infer<typeof institutionInputSchema>;
