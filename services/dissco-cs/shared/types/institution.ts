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
  logo: string | null;
  isActive: boolean;
  sortOrder: number;
};

// Max length of the logo as a data URI (an image of about 2 MB). Part of the schema, so it is
// checked in the form and again in the backend.
export const INSTITUTION_LOGO_MAX_LENGTH = 3_000_000;

// Deliberately permissive (digits, spaces and + - ( ) . /): a stricter check once rejected Belgian
// notation such as 02/123 45 67.
const PHONE_CHARS_REGEX = /^[0-9+\-\s().\/]+$/;

export const institutionInputSchema = z.object({
  name: multilingualTextSchema(true),
  description: multilingualTextSchema(true),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .min(1, 'Phone is required')
    .regex(PHONE_CHARS_REGEX, 'Invalid characters in phone number')
    .refine(v => (v.match(/\d/g) ?? []).length >= 6, 'Phone number is too short'),
  website: z.string().trim().min(1, 'Website is required'),
  logo: z
    .string()
    .min(1, 'Logo is required')
    .refine(v => v.startsWith('data:image/'), 'Logo must be an image data URI')
    .refine(v => v.length <= INSTITUTION_LOGO_MAX_LENGTH, 'Logo is too large'),
  isActive: z.boolean(),
});

export type InstitutionInput = z.infer<typeof institutionInputSchema>;
