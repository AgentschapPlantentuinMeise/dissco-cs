import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import nl from './translations/nl/dissco-cs.json';
import en from './translations/en/dissco-cs.json';
import fr from './translations/fr/dissco-cs.json';
import de from './translations/de/dissco-cs.json';
import { disscoCSConfig } from './dissco-cs-config';

void i18n.use(LanguageDetector).use(initReactI18next).init({
  supportedLngs: disscoCSConfig.supportedLanguages.map(l => l.code),
  fallbackLng: 'en',
  detection: {
    // A chosen language first, then the browser's. Madoc stores the chosen language under the same
    // cookie and localStorage keys (LanguageSwitcher.tsx in madoc-ts), so a language switch in Madoc
    // or in dissco-cs is picked up here too.
    order: ['cookie', 'localStorage', 'navigator'],
    lookupCookie: 'i18next',
    lookupLocalStorage: 'i18nextLng',
    // Only a real choice is stored (see change-language.ts): a stored browser language would look
    // like a choice and no longer follow the browser.
    caches: [],
    // The code compares i18n.language with our short codes, so 'nl-BE' has to become 'nl'.
    convertDetectedLanguage: language => language.split('-')[0],
  },
  resources: {
    nl: { 'dissco-cs': nl },
    en: { 'dissco-cs': en },
    fr: { 'dissco-cs': fr },
    de: { 'dissco-cs': de },
  },
  // platformName in a translation is the site's name (white-label software). Madoc's site title is
  // passed per call (useSiteName); this default only keeps a forgotten call from showing the raw
  // {{platformName}}.
  interpolation: { escapeValue: false, defaultVariables: { platformName: '' } },
});

export default i18n;
