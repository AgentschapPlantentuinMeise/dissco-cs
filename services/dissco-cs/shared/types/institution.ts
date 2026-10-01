import { z } from 'zod';
import { MultilingualText, multilingualTextSchema, emailSchema } from './common.js';

// Wire shape -- created_at/updated_at are DB bookkeeping only (see InstitutionRow in the API
// repository) and never sent to the frontend; routes strip them via toInstitutionDto().
export type InstitutionDto = {
  id: number;
  site_id: number;
  slug: string;
  name: MultilingualText;
  description: MultilingualText;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo: string | null;
  is_active: boolean;
  sort_order: number;
};

// Was api/src/validators.ts MAX_LOGO_LENGTH -- lives here now because the schema enforces the
// limit both client- and server-side.
export const INSTITUTION_LOGO_MAX_LENGTH = 3_000_000;

// Copied verbatim from the frontend's old isValidPhone -- keep permissive, a stricter regex once
// broke Belgian phone notation.
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

export type InstitutionStatsDto = {
  volunteers: number;
  tasksCompleted: number;
  tasksTotal: number;
  projectsActive: number;
  projectsCompleted: number;
};
