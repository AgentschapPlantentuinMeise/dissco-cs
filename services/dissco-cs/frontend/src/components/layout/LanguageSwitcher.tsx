import { useTranslation } from 'react-i18next';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { LuChevronDown } from 'react-icons/lu';
import { LANGUAGES } from '../../utility/site-lang-text';
import { changeLanguage } from '../../utility/change-language';
import { menuItemClass, menuItemsClass } from './nav-styles';

// The navbar's language menu for visitors who are not logged in; logged in, the languages sit in
// the account menu.
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('dissco-cs');
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  return (
    <Menu>
      <MenuButton
        aria-label={t('common_tabs_language')}
        className="inline-flex items-center gap-0.5 bg-transparent border-0 px-1.5 py-1.5 text-[0.85rem] font-semibold text-gray-500 cursor-pointer hover:text-cs-primary"
      >
        {currentLang.code.toUpperCase()} <LuChevronDown aria-hidden="true" />
      </MenuButton>
      <MenuItems anchor={{ to: 'bottom end', gap: 8 }} className={`${menuItemsClass} !min-w-[140px]`}>
        {LANGUAGES.map(lng => (
          <MenuItem key={lng.code}>
            <button
              type="button"
              onClick={() => changeLanguage(i18n, lng.code)}
              className={`${menuItemClass} ${lng.code === i18n.language ? 'font-semibold text-cs-primary' : ''}`}
            >
              {lng.label}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
