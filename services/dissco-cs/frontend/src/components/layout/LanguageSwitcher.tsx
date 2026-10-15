import React from 'react';
import { useTranslation } from 'react-i18next';
import useDropdownMenu from 'react-accessible-dropdown-menu-hook';
import Cookies from 'js-cookie';
import { LuChevronDown } from 'react-icons/lu';
import { LANGUAGES } from '../../utility/site-lang-text';
import { dropdownItemClass, dropdownListClass } from './nav-styles';

// The navbar's language dropdown. The choice is remembered in localStorage and the i18next cookie.
export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const { buttonProps, itemProps, isOpen, setIsOpen } = useDropdownMenu(LANGUAGES.length);
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  return (
    <div className="relative">
      <button
        className="bg-transparent border-none cursor-pointer text-gray-600 font-[380] text-base p-0 inline-flex items-center gap-1 hover:text-[var(--cs-primary)] transition-colors duration-200 max-[768px]:py-[10px]"
        {...buttonProps}
      >
        {currentLang.code.toUpperCase()} <LuChevronDown aria-hidden="true" />
      </button>
      <ul className={dropdownListClass(isOpen, 'top-[calc(100%+8px)] min-w-[130px]')} role="menu">
        {LANGUAGES.map((lng, key) => (
          <li key={lng.code}>
            <button
              className={dropdownItemClass}
              style={{ fontWeight: lng.code === i18n.language ? 'bold' : undefined }}
              onClick={() => {
                localStorage.setItem('i18nextLng', lng.code);
                Cookies.set('i18next', lng.code);
                i18n.changeLanguage(lng.code);
                setIsOpen(false);
              }}
              {...(itemProps[key] as unknown as React.ButtonHTMLAttributes<HTMLButtonElement>)}
            >
              {lng.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
