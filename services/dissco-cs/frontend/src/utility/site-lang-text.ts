import { disscoCSConfig } from '../dissco-cs-config';
import { SitePageLang } from '@dissco-cs/shared-types';

export const LANGUAGES = disscoCSConfig.supportedLanguages;

export function defaultLang(currentLanguage: string): SitePageLang {
  return (LANGUAGES.find(lang => lang.code === currentLanguage)?.code ?? LANGUAGES[0].code) as SitePageLang;
}

// Fallback chain for dissco-cs' own per-language string fields (SitePageLang -> string), as
// opposed to Madoc's array-based MadocInternationalString (see utility/locale-text.ts for that).
export function siteLangText(field: Partial<Record<SitePageLang, string>> | undefined, lang: string, fallback: string): string {
  if (!field) return fallback;
  return field[lang as SitePageLang] || field.nl || field.en || field.fr || field.de || fallback;
}
