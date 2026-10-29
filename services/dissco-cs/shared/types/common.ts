import { z } from 'zod';

// Madoc's format for text in several languages: per language code a list of strings, e.g.
// { en: ['Leaf'], nl: ['Blad'] }. Used by many Madoc types (project, manifest, collection, task).
export type MadocInternationalString = { [lang: string]: string[] };

export const SITE_PAGE_LANGS = ['nl', 'en', 'fr', 'de'] as const;
export type SitePageLang = (typeof SITE_PAGE_LANGS)[number];

export type PerLanguage<T> = Partial<Record<SitePageLang, T>>;
export type MultilingualText = PerLanguage<string>;

// The longest address SMTP allows (RFC 5321).
export const MAX_EMAIL_LENGTH = 254;
// Madoc's project slugs, as stored with a forum topic or an announcement.
export const MAX_PROJECT_SLUG_LENGTH = 200;

// Zod's built-in email check, so there is no hand-written regex to maintain.
export const emailSchema = z.string().trim().max(MAX_EMAIL_LENGTH).pipe(z.email());

/**
 * The zod schema of a text in every site language (nl, en, fr, de), each one trimmed.
 * @param requireFilled true: every language must be filled in; false: every language is
 *   optional, but a language that is sent may not be empty
 * @param maxLength optional: the most characters each language may have
 * Returns: a zod object schema with one key per language.
 */
export function multilingualTextSchema(requireFilled: boolean, maxLength?: number) {
  const text = maxLength === undefined ? z.string().trim().min(1) : z.string().trim().min(1).max(maxLength);
  if (requireFilled) {
    const shape = Object.fromEntries(SITE_PAGE_LANGS.map(lang => [lang, text])) as Record<
      SitePageLang,
      z.ZodString
    >;
    return z.object(shape);
  }

  const shape = Object.fromEntries(SITE_PAGE_LANGS.map(lang => [lang, text.optional()])) as Record<
    SitePageLang,
    z.ZodOptional<z.ZodString>
  >;
  return z.object(shape);
}

export const sitePageLangSchema = z.enum(SITE_PAGE_LANGS);
