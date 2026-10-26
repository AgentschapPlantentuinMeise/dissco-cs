import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Disclosure, DisclosureButton } from '@headlessui/react';
import { LuMenu, LuX } from 'react-icons/lu';
import { HrefLink } from '../../utility/href-link';
import { useCurrentUser } from '../../hooks/use-current-user';
import { NavSearch } from './NavSearch';
import { LanguageSwitcher } from './LanguageSwitcher';
import { AnnouncementPin } from '../announcements/AnnouncementPin';
import { UserMenu } from './UserMenu';
import { SiteLogo } from './SiteLogo';
import { ForumNavLink } from './ForumNavLink';
import { MobileNavPanel } from './MobileNavPanel';
import { BAR_LINK_KEYS } from './nav-config';
import { NavLink, useNavLinks } from './use-nav-links';
import { buttonClass } from '../ui/Button';
import { useSiteName } from '../../hooks/use-site-name';

const PROJECTS_LINK: NavLink = { key: 'projects', labelKey: 'nav_projects', href: '/explore' };

// The fixed bar on top of every page: logo, the links to the pages with a large header, and on the
// right search, the forum, the announcements pin and the account menu (or language and login).
// On a phone the links and search move into a menu below the bar.
export function Navbar() {
  const { t } = useTranslation('dissco-cs');
  const platformName = useSiteName();
  const user = useCurrentUser();
  const location = useLocation();
  const { linksFor, isVisible } = useNavLinks();
  const links = [PROJECTS_LINK, ...linksFor(BAR_LINK_KEYS)];

  useLayoutEffect(() => {
    document.body.classList.add('cs-active');
    return () => document.body.classList.remove('cs-active');
  }, []);

  return (
    // Keyed on the path, so the mobile menu closes after following one of its links.
    <Disclosure as="nav" key={location.pathname} className="cs-navbar">
      <div className="cs-container cs-container--wide h-navbar flex items-center gap-3 lg:gap-6">
        <HrefLink href="/" className="mr-auto min-w-0 flex items-center no-underline">
          <SiteLogo />
        </HrefLink>

        <ul className="hidden lg:flex self-stretch items-stretch gap-6 list-none m-0 p-0">
          {links.map(link => {
            const isCurrent = location.pathname.startsWith(link.href);
            return (
              <li key={link.key} className="flex">
                <HrefLink
                  href={link.href}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`flex items-center border-y-2 border-t-transparent text-[0.92rem] no-underline transition-colors duration-150 hover:text-cs-primary ${
                    isCurrent ? 'border-b-cs-primary font-semibold text-cs-primary' : 'border-b-transparent text-gray-500'
                  }`}
                >
                  {t(link.labelKey, { platformName })}
                </HrefLink>
              </li>
            );
          })}
        </ul>

        {/* Separates the pages from the tools on the right. */}
        <span className="hidden lg:block w-px h-6 bg-gray-200" aria-hidden="true" />

        <div className="flex items-center gap-3 lg:gap-5">
          <span className="hidden lg:flex">
            <NavSearch />
          </span>
          {user && isVisible('forum') && (
            <span className="hidden lg:flex">
              <ForumNavLink />
            </span>
          )}
          {user && <AnnouncementPin />}
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <span className="hidden lg:flex">
                <LanguageSwitcher />
              </span>
              <HrefLink href="/login" className={`${buttonClass({ size: 'sm' })} whitespace-nowrap`}>
                {t('nav_login')}
              </HrefLink>
            </>
          )}
          <DisclosureButton
            aria-label={t('nav_menu_label')}
            className="group lg:hidden grid place-items-center w-[34px] h-[34px] bg-transparent border-0 p-0 text-gray-600 text-xl cursor-pointer"
          >
            <LuMenu aria-hidden="true" className="group-data-[open]:hidden" />
            <LuX aria-hidden="true" className="hidden group-data-[open]:block" />
          </DisclosureButton>
        </div>
      </div>
      <MobileNavPanel projectsLink={PROJECTS_LINK} />
    </Disclosure>
  );
}
