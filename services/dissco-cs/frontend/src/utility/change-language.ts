import Cookies from 'js-cookie';
import type { i18n as I18n } from 'i18next';

/**
 * Switches the site language and remembers it. Madoc reads the same localStorage key and cookie, so
 * its own pages (login, account) follow the choice.
 * @param i18n the instance from useTranslation()
 * @param code a site language code (LANGUAGES)
 * Returns: nothing.
 */
export function changeLanguage(i18n: I18n, code: string) {
  localStorage.setItem('i18nextLng', code);
  Cookies.set('i18next', code);
  i18n.changeLanguage(code);
}

/**
 * Forgets the chosen language, so the site follows the browser again.
 * @param i18n the instance from useTranslation()
 * Returns: nothing.
 */
export function clearLanguageChoice(i18n: I18n) {
  localStorage.removeItem('i18nextLng');
  Cookies.remove('i18next');
  i18n.changeLanguage();
}
