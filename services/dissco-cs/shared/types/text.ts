import { PerLanguage, SITE_PAGE_LANGS } from './common.js';

// URL-safe slug: accents stripped, lower case, every run of other characters becomes one '-'.
// A text without any usable character (e.g. only symbols) gives `fallback` instead of ''.
export function slugify(text: string, fallback: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

// The first filled-in value of a per-language field, in the site's language order (nl, en, fr, de).
export function firstFilledLang(field: PerLanguage<string> | undefined): string | undefined {
  if (!field) return undefined;
  for (const lang of SITE_PAGE_LANGS) {
    const value = field[lang];
    if (value) return value;
  }
  return undefined;
}
