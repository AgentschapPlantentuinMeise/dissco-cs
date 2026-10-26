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
  platformName: 'DiSSCo Flanders',
  developer: 'Plantentuin Meise',
  developerUrl: 'https://www.plantentuinmeise.be',

  organisation: {
    nl: 'Plantentuin Meise',
    en: 'Meise Botanic Garden',
    fr: 'Jardin botanique de Meise',
    de: 'Botanischer Garten Meise',
  },

  logoUrl: new URL('./images/disscoflanders_logo.png', import.meta.url).href,
  // The logos at the bottom of the footer, on every site of this installation: the project that
  // built the platform, its funder and the open-source platform it is built on. labelKey: an
  // optional text before the logo.
  footerLogos: [
    {
      name: 'DiSSCo Flanders',
      url: 'https://dissco-flanders.be/',
      logoUrl: new URL('./images/disscoflanders_logo.png', import.meta.url).href,
    },
    {
      name: 'FWO',
      url: 'https://www.fwo.be',
      logoUrl: new URL('./images/fwologo.png', import.meta.url).href,
      labelKey: 'footer_supported_by',
    },
    {
      name: 'Madoc',
      url: 'https://github.com/digirati-co-uk/madoc-platform',
      logoUrl: new URL('./images/madoc_logo.png', import.meta.url).href,
      labelKey: 'footer_built_with',
    },
  ] as { name: string; url: string; logoUrl: string; labelKey?: string }[],
  heroBgUrl: new URL('./images/backgroundflower.png', import.meta.url).href,
  heroBgCredit: 'Maarten Strack van Schijndel',

  supportedLanguages: SITE_PAGE_LANGS.map(code => ({ label: LANGUAGE_NAMES[code], code })),
};
