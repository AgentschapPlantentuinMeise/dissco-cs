import React, { useState, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { forumQueries } from '../../api/queries/forum';
import { HrefLink } from '../../utility/href-link';
import { useCurrentUser } from '../../hooks/use-current-user';
import { disscoCSConfig } from '../../dissco-cs-config';
import { useNavItems } from '../../hooks/use-nav-items';
import { NAV_ITEMS } from './nav-config';
import { NavSearch } from './NavSearch';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';
import { buttonClass } from '../ui/Button';

const navLinkClass = (isActive: boolean) =>
  `no-underline text-base transition-colors duration-200 hover:text-cs-primary
   block py-[10px] border-t border-[#f0f0f0]
   md:inline md:py-0 md:border-t-0
   ${isActive ? 'font-medium text-cs-accent' : 'font-[380] text-gray-600'}`;

export function Navbar() {
  const { t } = useTranslation('dissco-cs');
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useCurrentUser();
  const location = useLocation();
  const { navItems } = useNavItems();

  useLayoutEffect(() => {
    document.body.classList.add('cs-active');
    return () => document.body.classList.remove('cs-active');
  }, []);

  // Unread badge: refreshed by invalidation from the forum page (no window events).
  const { data: newMsgCount = 0 } = useQuery({ ...forumQueries.unreadCount(), enabled: !!user });

  return (
    <nav className="cs-navbar">
      <div className="flex justify-between items-center w-full px-10 h-full max-[768px]:flex-wrap max-[768px]:px-5 max-[768px]:py-3 max-[768px]:h-auto">

        <HrefLink href="/" className="flex items-center cursor-pointer no-underline">
          <img src={disscoCSConfig.logoUrl} alt={`${disscoCSConfig.platformName} Logo`} className="h-[25px] w-auto block" />
        </HrefLink>

        {/* Hamburger — only visible on mobile */}
        <button
          className="md:hidden flex flex-col justify-between w-6 h-[18px] bg-transparent border-none cursor-pointer p-0"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={t('nav_menu_label')}
          aria-expanded={menuOpen}
        >
          <span className={`block h-0.5 w-full bg-gray-600 rounded-sm transition-transform duration-200 ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`block h-0.5 w-full bg-gray-600 rounded-sm transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 w-full bg-gray-600 rounded-sm transition-transform duration-200 ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>

        {/* Nav menu */}
        <ul className={`list-none m-0 p-0 gap-5 items-center
          ${menuOpen ? 'flex flex-col w-full gap-0 py-2' : 'hidden'}
          md:flex md:flex-row md:gap-5 md:w-auto md:py-0`}>

          <li>
            <HrefLink
              href="/explore"
              className={navLinkClass(location.pathname.startsWith('/explore'))}
              onClick={() => setMenuOpen(false)}
            >
              {t('nav_projects')}
            </HrefLink>
          </li>

          {navItems.map(navItem => {
            const nav = NAV_ITEMS[navItem.pageKey];
            if (!nav || !navItem.isActive || (nav.requiresLogin && !user)) {
              return null;
            }

            return (
              <li key={navItem.pageKey}>
                <HrefLink
                  href={nav.href}
                  className={navLinkClass(location.pathname.startsWith(nav.href))}
                  onClick={() => setMenuOpen(false)}
                >
                  {t(nav.labelKey)}
                  {navItem.pageKey === 'forum' && newMsgCount > 0 && (
                    <span className="inline-block bg-cs-accent text-white rounded-[10px] px-[6px] py-[1px] text-[0.7rem] font-bold ml-[5px] align-middle leading-[1.4]">
                      {newMsgCount}
                    </span>
                  )}
                </HrefLink>
              </li>
            );
          })}

          <li className="relative max-[768px]:border-t max-[768px]:border-[#f0f0f0] max-[768px]:w-full max-[768px]:py-[10px]">
            <NavSearch onSearched={() => setMenuOpen(false)} />
          </li>

          <li className="relative max-[768px]:border-t max-[768px]:border-[#f0f0f0] max-[768px]:w-full">
            <LanguageSwitcher />
          </li>

          <li className="relative max-[768px]:w-full">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <HrefLink
                href="/login"
                className={`${buttonClass({ size: 'sm' })} whitespace-nowrap max-[768px]:flex max-[768px]:justify-start max-[768px]:py-[10px] max-[768px]:px-0 max-[768px]:bg-transparent max-[768px]:text-cs-primary max-[768px]:text-base max-[768px]:border-0 max-[768px]:border-t max-[768px]:border-[#f0f0f0] max-[768px]:rounded-none hover:max-[768px]:bg-transparent hover:max-[768px]:text-cs-dark hover:max-[768px]:translate-y-0`}
              >
                {t('nav_login')}
              </HrefLink>
            )}
          </li>

        </ul>
      </div>
    </nav>
  );
}
