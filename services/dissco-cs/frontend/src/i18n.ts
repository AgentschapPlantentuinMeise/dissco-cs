import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import nl from './translations/nl/dissco-cs.json';
import en from './translations/en/dissco-cs.json';
import fr from './translations/fr/dissco-cs.json';
import de from './translations/de/dissco-cs.json';
import { disscoCSConfig } from './dissco-cs-config';

void i18n.use(initReactI18next).init({
  lng: 'nl',
  fallbackLng: 'en',
  resources: {
    nl: { 'dissco-cs': nl },
    en: { 'dissco-cs': en },
    fr: { 'dissco-cs': fr },
    de: { 'dissco-cs': de },
  },
  // platformName is injected into every translation automatically, so the platform's
  // name never has to be hardcoded in a translation string (this is white-label software).
  interpolation: { escapeValue: false, defaultVariables: { platformName: disscoCSConfig.platformName } },
});

export default i18n;
