import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Cookies from 'js-cookie';
import nl from './translations/nl/dissco-cs.json';
import en from './translations/en/dissco-cs.json';
import fr from './translations/fr/dissco-cs.json';
import de from './translations/de/dissco-cs.json';
import { disscoCSConfig } from './dissco-cs-config';

// Madoc bewaart de gekozen taal in dezelfde cookie/localStorage-keys (zie
// LanguageSwitcher.tsx in madoc-ts), zodat een taalwissel in Madoc of dissco-cs
// hier ook herkend wordt.
function getStoredLanguage(): string | undefined {
  const supportedCodes: readonly string[] = disscoCSConfig.supportedLanguages.map(l => l.code);
  const stored = Cookies.get('i18next') || localStorage.getItem('i18nextLng') || undefined;
  return stored && supportedCodes.includes(stored) ? stored : undefined;
}

void i18n.use(initReactI18next).init({
  lng: getStoredLanguage() || 'nl',
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
