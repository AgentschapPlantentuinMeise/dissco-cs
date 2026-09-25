import { z } from 'zod';
import { SITE_PAGE_LANGS, SitePageLang } from './site-page.js';

// Wire shape -- created_at/updated_at are DB bookkeeping only (see InstitutionRow in the API
// repository) and never sent to the frontend; routes strip them via toInstitutionDto().
export type Institution = {
  id: number;
  site_id: number;
  slug: string;
  name: Partial<Record<SitePageLang, string>>;
  description: Partial<Record<SitePageLang, string>>;
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Copied verbatim from the frontend's old isValidPhone -- keep permissive, a stricter regex once
// broke Belgian phone notation.
const PHONE_CHARS_REGEX = /^[0-9+\-\s().\/]+$/;

const multilingualTextShape = Object.fromEntries(
  SITE_PAGE_LANGS.map(lang => [lang, z.string().trim().min(1, 'Required in all languages')])
) as Record<SitePageLang, z.ZodString>;
const multilingualTextSchema = z.object(multilingualTextShape);

export const institutionInputSchema = z.object({
  name: multilingualTextSchema,
  description: multilingualTextSchema,
  email: z.string().trim().min(1, 'Email is required').regex(EMAIL_REGEX, 'Invalid email'),
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

export type InstitutionOverview = {
  volunteers: number;
  tasksCompleted: number;
  tasksTotal: number;
  projectsActive: number;
  projectsCompleted: number;
};
