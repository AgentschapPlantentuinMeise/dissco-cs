import { useTranslation } from 'react-i18next';
import { NavItemKey } from '@dissco-cs/shared-types';
import { HrefLink } from '../../utility/href-link';
import { disscoCSConfig } from '../../dissco-cs-config';
import { NAV_ITEMS } from './nav-config';
import { useNavLinks } from './use-nav-links';
import { useSiteName } from '../../hooks/use-site-name';

// The same dark footer under every page, so no page just stops. Links follow the navbar: a page
// switched off in page management is left out, and the forum only shows for logged-in users.
const COLUMNS: { titleKey: string; keys: NavItemKey[]; withProjects?: boolean }[] = [
  { titleKey: 'footer_join', keys: ['institutions', 'forum'], withProjects: true },
  { titleKey: 'footer_about', keys: ['about', 'help', 'contact'] },
];

const linkClass = 'text-[#d3e8e5] no-underline hover:text-white hover:underline';

export function SiteFooter() {
  const { t } = useTranslation('dissco-cs');
  const { isVisible } = useNavLinks();
  const platformName = useSiteName();
  const { footerLogos } = disscoCSConfig;

  return (
    <footer>
      <div className="bg-cs-dark text-[#d3e8e5]">
        <div className="cs-container cs-container--wide pt-10 pb-9 grid grid-cols-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-7">
          <div className="col-span-2 md:col-span-1">
            <p className="m-0 mb-2 text-[1.15rem] font-semibold text-white">{platformName}</p>
            <p className="text-[0.9rem] max-w-[40ch] m-0">{t('footer_tagline')}</p>
          </div>
          {COLUMNS.map(column => (
            <nav key={column.titleKey} aria-label={t(column.titleKey)}>
              <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[#9fc9c4] m-0 mb-2.5">{t(column.titleKey)}</h2>
              <ul className="list-none m-0 p-0 flex flex-col gap-1.5 text-[0.9rem]">
                {column.withProjects && (
                  <li><HrefLink href="/explore" className={linkClass}>{t('nav_projects')}</HrefLink></li>
                )}
                {column.keys.filter(isVisible).map(key => {
                  const entry = NAV_ITEMS[key];
                  return entry && (
                    <li key={key}>
                      <HrefLink href={entry.href} className={linkClass}>{t(entry.labelKey, { platformName })}</HrefLink>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      {/* A white strip below the dark part: a partner's own colours are not all readable on the
          dark footer, and one strip is calmer than a white tile per logo. */}
      <div className="bg-white border-t border-gray-200">
        <div className="cs-container cs-container--wide py-3.5 flex flex-wrap items-center justify-between gap-3 text-[0.8rem] text-gray-500">
          <span>{t('footer_text')}</span>
          {footerLogos.length > 0 && (
            <span className="flex flex-wrap items-center gap-6">
              {footerLogos.map(logo => (
                <a
                  key={logo.name}
                  href={logo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 no-underline text-gray-500 hover:text-cs-primary"
                >
                  {logo.labelKey && t(logo.labelKey, { platformName })}
                  <img src={logo.logoUrl} alt={logo.name} className="h-6 w-auto block" />
                </a>
              ))}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
