import { z } from 'zod';

export const SITE_PAGE_LANGS = ['nl', 'en', 'fr', 'de'] as const;
export type SitePageLang = (typeof SITE_PAGE_LANGS)[number];

// Zod's eigen ingebouwde e-mailvalidator i.p.v. een handgeschreven regex -- geen eigen regex meer
// om te onderhouden. Iets strenger dan de oude losse regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), bewust
// aanvaard: niemand kon een concreet geval noemen waarbij de oude regex iets doorliet dat de
// nieuwe zou weigeren.
export const emailSchema = z.string().trim().pipe(z.email());

export function multilingualTextSchema(requireFilled: boolean) {
  if (requireFilled) {
    const shape = Object.fromEntries(SITE_PAGE_LANGS.map(lang => [lang, z.string().trim().min(1)])) as Record<
      SitePageLang,
      z.ZodString
    >;
    return z.object(shape);
  }

  const shape = Object.fromEntries(SITE_PAGE_LANGS.map(lang => [lang, z.string().trim().min(1).optional()])) as Record<
    SitePageLang,
    z.ZodOptional<z.ZodString>
  >;
  return z.object(shape);
}

export const sitePageLangSchema = z.enum(SITE_PAGE_LANGS);
