import { useTranslation } from 'react-i18next';
import { DisclosurePanel } from '@headlessui/react';
import { useLocation } from 'react-router-dom';
import { HrefLink } from '../../utility/href-link';
import { useCurrentUser } from '../../hooks/use-current-user';
import { LANGUAGES } from '../../utility/site-lang-text';
import { NavSearch } from './NavSearch';
import { NavLink, useNavLinks } from './use-nav-links';
import { BAR_LINK_KEYS, SUPPORT_LINK_KEYS } from './nav-config';
import { changeLanguage } from '../../utility/change-language';
import { useSiteName } from '../../hooks/use-site-name';

// The menu below the navbar on a phone: search, the links (with the forum for a logged-in user),
// then help, contact and the languages in a small row. The pin and the avatar stay in the bar.
export function MobileNavPanel({ projectsLink }: { projectsLink: NavLink }) {
  const { t, i18n } = useTranslation('dissco-cs');
  const platformName = useSiteName();
  const location = useLocation();
  const user = useCurrentUser();
  const { linksFor } = useNavLinks();
  const links = [projectsLink, ...linksFor(user ? [...BAR_LINK_KEYS, 'forum'] : BAR_LINK_KEYS)];

  return (
    <DisclosurePanel className="lg:hidden bg-white border-t border-gray-200 px-4 pb-4">
      <div className="py-3">
        <NavSearch variant="panel" />
      </div>
      <ul className="list-none m-0 p-0">
        {links.map(link => (
          <li key={link.key} className="border-t border-gray-100">
            <HrefLink
              href={link.href}
              className={`block py-3 no-underline ${location.pathname.startsWith(link.href) ? 'font-semibold text-cs-primary' : 'text-gray-800'}`}
            >
              {t(link.labelKey, { platformName })}
            </HrefLink>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3 text-[0.85rem]">
        {linksFor(SUPPORT_LINK_KEYS).map(link => (
          <HrefLink key={link.key} href={link.href} className="text-gray-500 no-underline hover:text-cs-primary">
            {t(link.labelKey, { platformName })}
          </HrefLink>
        ))}
        <span className="flex gap-1 ml-auto" role="group" aria-label={t('common_tabs_language')}>
          {LANGUAGES.map(lng => (
            <button
              key={lng.code}
              type="button"
              onClick={() => changeLanguage(i18n, lng.code)}
              aria-label={lng.label}
              aria-pressed={lng.code === i18n.language}
              className={`rounded border bg-white px-2 py-0.5 text-[0.8rem] font-semibold cursor-pointer ${
                lng.code === i18n.language ? 'border-cs-primary text-cs-primary' : 'border-gray-200 text-gray-500'
              }`}
            >
              {lng.code.toUpperCase()}
            </button>
          ))}
        </span>
      </div>
    </DisclosurePanel>
  );
}
