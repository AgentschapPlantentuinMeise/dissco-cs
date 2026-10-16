import { PerLanguage, SITE_PAGE_LANGS } from './common.js';

/**
 * A URL-safe slug: accents removed, lower case, every run of other characters becomes one '-',
 * with no '-' at the start or end. E.g. 'Plantentuin Meisé!' -> 'plantentuin-meise'.
 * @param text the text to turn into a slug
 * @param fallback returned when nothing usable is left (e.g. a text of only symbols)
 * Returns: the slug, or fallback.
 */
export function slugify(text: string, fallback: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

/**
 * The first filled-in value of a per-language field, in the order nl, en, fr, de (SITE_PAGE_LANGS).
 * @param field the text per language; may be undefined
 * Returns: that value, or undefined when no language is filled in.
 */
export function firstFilledLang(field: PerLanguage<string> | undefined): string | undefined {
  if (!field) return undefined;
  for (const lang of SITE_PAGE_LANGS) {
    const value = field[lang];
    if (value) return value;
  }
  return undefined;
}
