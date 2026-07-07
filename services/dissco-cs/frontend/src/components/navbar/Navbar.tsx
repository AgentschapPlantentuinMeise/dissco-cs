import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useDropdownMenu from 'react-accessible-dropdown-menu-hook';
import { stringify } from 'query-string';
import { useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';
import { HrefLink } from '../../utility/href-link';
import { useUser } from '../../hooks/use-current-user';
import { PersonIcon } from '../../icons/PersonIcon';
import { disscoCSConfig } from '../../dissco-cs-config';
import { getSiteSlug } from '../../api/slug';
import { forumApi } from '../../api/cs-api';
import { useSitePages } from '../../contexts/SitePagesContext';
import { SITE_PAGE_NAV } from '../../site-pages-nav-config';

const LANGUAGES = disscoCSConfig.supportedLanguages;

const navLinkClass = (isActive: boolean) =>
  `no-underline text-base transition-colors duration-200 hover:text-[var(--cs-primary)]
   block py-[10px] border-t border-[#f0f0f0]
   md:inline md:py-0 md:border-t-0
   ${isActive ? 'font-bold text-[var(--cs-accent)]' : 'font-medium text-gray-600'}`;

const dropdownItemClass =
  'block w-full px-4 py-[10px] no-underline text-gray-600 text-[0.9rem] bg-transparent border-none cursor-pointer text-left box-border transition-colors duration-150 hover:bg-gray-100 hover:text-[var(--cs-primary)]';

export const Navbar: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const [menuOpen, setMenuOpen] = useState(false);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const user = useUser();
  const siteSlug = getSiteSlug();
  const location = useLocation();
  const { pages } = useSitePages();
  const showAdmin = !!user && user.scope.includes('site.admin');
  // Let op: reviewer-rol (site_role/role) is niet beschikbaar in het JWT, enkel scope.
  // De site.admin-scope alleen volstaat al om de review-link te tonen (zelfde als showAdmin).
  const showReview = showAdmin;
  const dropdownCount = 3 + (showReview ? 1 : 0) + (showAdmin ? 1 : 0);

  const { buttonProps, itemProps, isOpen, setIsOpen } = useDropdownMenu(dropdownCount);
  const idxReview = showReview ? 2 : -1;
  const idxSiteAdmin = showAdmin ? 2 + (showReview ? 1 : 0) : -1;
  const idxLogout = 2 + (showReview ? 1 : 0) + (showAdmin ? 1 : 0);

  const { i18n } = useTranslation();
  const { buttonProps: langBtnProps, itemProps: langItemProps, isOpen: langIsOpen, setIsOpen: setLangIsOpen } =
    useDropdownMenu(LANGUAGES.length);
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const collectiesSlug = disscoCSConfig.collectiesSlug;

  useLayoutEffect(() => {
    document.body.classList.add('cs-active');
    return () => document.body.classList.remove('cs-active');
  }, []);

  useEffect(() => {
    if (!user) return;

    const refreshUnreadCount = () => {
      forumApi.listTopics().then(res => {
        const count = res.topics.filter(m => {
          const seen = m.last_seen_reply_count;
          return seen === null || m.reply_count > seen;
        }).length;
        setNewMsgCount(count);
      }).catch(() => {});
    };

    refreshUnreadCount();
    window.addEventListener('mb_updated', refreshUnreadCount);
    return () => window.removeEventListener('mb_updated', refreshUnreadCount);
  }, [user?.id]);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

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
          aria-label="Menu"
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
              href={`/${collectiesSlug}`}
              className={navLinkClass(location.pathname.startsWith(`/${collectiesSlug}`))}
              onClick={() => setMenuOpen(false)}
            >
              {t('nav_projects')}
            </HrefLink>
          </li>

          {pages.map(page => {
            const nav = SITE_PAGE_NAV[page.page_key];
            if (!page.is_active || (nav.requiresLogin && !user)) {
              return null;
            }

            return (
              <li key={page.page_key}>
                <HrefLink
                  href={nav.href}
                  className={navLinkClass(location.pathname.startsWith(nav.href))}
                  onClick={() => setMenuOpen(false)}
                >
                  {t(nav.labelKey)}
                  {page.page_key === 'forum' && newMsgCount > 0 && (
                    <span className="inline-block bg-[var(--cs-accent)] text-white rounded-[10px] px-[6px] py-[1px] text-[0.7rem] font-bold ml-[5px] align-middle leading-[1.4]">
                      {newMsgCount}
                    </span>
                  )}
                </HrefLink>
              </li>
            );
          })}

          {/* Language switcher */}
          <li className="relative max-[768px]:border-t max-[768px]:border-[#f0f0f0] max-[768px]:w-full">
            <div className="relative">
              <button
                className="bg-transparent border-none cursor-pointer text-gray-600 font-medium text-base p-0 hover:text-[var(--cs-primary)] transition-colors duration-200 max-[768px]:py-[10px]"
                {...langBtnProps}
              >
                {currentLang.code.toUpperCase()} ▾
              </button>
              <ul
                className={`${langIsOpen ? 'block' : 'hidden'} absolute top-[calc(100%+8px)] right-0 bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12)] min-w-[130px] z-[100] list-none p-[6px_0] m-0 max-[768px]:static max-[768px]:shadow-none max-[768px]:rounded-none max-[768px]:border-t max-[768px]:border-[#f0f0f0] max-[768px]:min-w-0`}
                role="menu"
              >
                {LANGUAGES.map((lng, key) => (
                  <li key={lng.code}>
                    <button
                      className={dropdownItemClass}
                      style={{ fontWeight: lng.code === i18n.language ? 'bold' : undefined }}
                      onClick={() => {
                        localStorage.setItem('i18nextLng', lng.code);
                        Cookies.set('i18next', lng.code);
                        i18n.changeLanguage(lng.code);
                        setLangIsOpen(false);
                      }}
                      {...(langItemProps[key] as unknown as React.ButtonHTMLAttributes<HTMLButtonElement>)}
                    >
                      {lng.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </li>

          {/* User section */}
          <li className="relative max-[768px]:w-full">
            {user ? (
              <div className="relative">
                <button
                  className="bg-transparent border-none cursor-pointer text-gray-600 font-medium text-base flex items-center gap-1 p-0 hover:text-[var(--cs-primary)] transition-colors duration-200 max-[768px]:py-[10px] max-[768px]:border-t max-[768px]:border-[#f0f0f0] max-[768px]:w-full"
                  {...buttonProps}
                >
                  <PersonIcon style={{ fontSize: '1.2em', fill: 'currentColor', flexShrink: 0 }} />
                  {user.name} ▾
                </button>
                <ul
                  className={`${isOpen ? 'block' : 'hidden'} absolute top-[calc(100%+10px)] right-0 bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12)] min-w-[200px] z-[100] list-none p-[6px_0] m-0 max-[768px]:static max-[768px]:shadow-none max-[768px]:rounded-none max-[768px]:border-t max-[768px]:border-[#f0f0f0] max-[768px]:min-w-0`}
                  role="menu"
                >
                  <li><HrefLink href="/my-tasks" className={dropdownItemClass} {...itemProps[0]}>{t('nav_my_tasks')}</HrefLink></li>
                  <li><a href={`/s/${siteSlug}/account`} className={dropdownItemClass} {...itemProps[1]}>{t('nav_profile_settings')}</a></li>
                  {showReview && (
                    <li><a href={`/s/${siteSlug}/reviews`} className={dropdownItemClass} {...itemProps[idxReview]}>{t('nav_review')}</a></li>
                  )}
                  {showAdmin && (
                    <li><HrefLink href="/beheer" className={dropdownItemClass} {...itemProps[idxSiteAdmin]}>{t('nav_site_admin')}</HrefLink></li>
                  )}
                  <li className="border-t border-[#eee] mt-1 pt-1">
                    <a
                      href={`/s/${siteSlug}/logout?${stringify({ redirect: `/s/${siteSlug}/` })}`}
                      className={dropdownItemClass}
                      {...itemProps[idxLogout]}
                    >
                      {t('nav_logout')}
                    </a>
                  </li>
                </ul>
              </div>
            ) : (
              <a
                href={`/s/${siteSlug}/login`}
                className="no-underline font-semibold whitespace-nowrap transition-colors duration-200 bg-[var(--cs-primary)] text-white text-[0.9rem] px-[18px] py-[6px] rounded-full inline-block hover:bg-[var(--cs-dark)] max-[768px]:block max-[768px]:py-[10px] max-[768px]:px-0 max-[768px]:bg-transparent max-[768px]:text-[var(--cs-primary)] max-[768px]:text-base max-[768px]:border-t max-[768px]:border-[#f0f0f0] max-[768px]:rounded-none hover:max-[768px]:bg-transparent hover:max-[768px]:text-[var(--cs-dark)]"
              >
                {t('nav_login')}
              </a>
            )}
          </li>

        </ul>
      </div>
    </nav>
  );
};
