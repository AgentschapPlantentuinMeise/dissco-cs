import { SITE_PAGE_LANGS, SitePageLang } from '@dissco-cs/shared-types';

// Each language's own name, for the language switcher. Keyed by SitePageLang, so adding a language to
// SITE_PAGE_LANGS (shared) makes TypeScript ask for its name here.
const LANGUAGE_NAMES: Record<SitePageLang, string> = {
  nl: 'Nederlands',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
};

export const disscoCSConfig = {
  platformName: 'DoeDat',
  developer: 'Plantentuin Meise',
  developerUrl: 'https://www.plantentuinmeise.be',

  organisation: {
    nl: 'Plantentuin Meise',
    en: 'Meise Botanic Garden',
    fr: 'Jardin botanique de Meise',
    de: 'Botanischer Garten Meise',
  },

  logoUrl: new URL('./images/logoDoeDat.png', import.meta.url).href,
  heroBgUrl: new URL('./images/backgroundflower.png', import.meta.url).href,
  heroBgCredit: 'Maarten Strack van Schijndel',

  supportedLanguages: SITE_PAGE_LANGS.map(code => ({ label: LANGUAGE_NAMES[code], code })),
};
