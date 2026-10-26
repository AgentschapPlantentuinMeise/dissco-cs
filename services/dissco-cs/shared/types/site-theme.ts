import { z } from 'zod';

// The five brand colors a site admin can set. Each one overrides the CSS variable --cs-<key>
// (defaults in the frontend's citizen-science-theme.css), which the Tailwind tokens cs-<key> read.
export const SITE_COLOR_KEYS = ['primary', 'secondary', 'accent', 'dark', 'tertiary'] as const;
export type SiteColorKey = (typeof SITE_COLOR_KEYS)[number];

// Every value is '#rrggbb' in lower case.
export interface SiteColors {
  primary: string;
  secondary: string;
  accent: string;
  dark: string;
  tertiary: string;
}

// colors is null while the site has no palette of its own: the defaults from the CSS apply.
// name is null while the site has no name of its own: the platform's name from the frontend's
// config applies.
export interface SiteThemeDto {
  colors: SiteColors | null;
  name: string | null;
}

export const MAX_SITE_NAME_LENGTH = 60;

// An empty name removes the site's own name, so the platform's name applies again.
export const siteNameSchema = z.strictObject({ name: z.string().trim().max(MAX_SITE_NAME_LENGTH) });

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i)
  .toLowerCase();

export const siteColorsSchema = z.strictObject({
  primary: hexColorSchema,
  secondary: hexColorSchema,
  accent: hexColorSchema,
  dark: hexColorSchema,
  tertiary: hexColorSchema,
});
