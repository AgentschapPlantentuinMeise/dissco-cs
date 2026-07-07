import React from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { useUser } from '../../hooks/use-current-user';
import { getSiteSlug } from '../../api/slug';
import { HrefLink } from '../../utility/href-link';
import { CsPage } from '../../components/CsPage';

interface Tile {
  href: string;
  external?: boolean;
  titleKey: string;
  descKey: string;
}

const TILES: Tile[] = [
  { href: '/beheer/projecten', titleKey: 'sm_tile_projects_title', descKey: 'sm_tile_projects_desc' },
  { href: '/beheer/meldingen', titleKey: 'sm_tile_announcements_title', descKey: 'sm_tile_announcements_desc' },
  { href: '/beheer/gebruikers', titleKey: 'sm_tile_users_title', descKey: 'sm_tile_users_desc' },
  { href: '/beheer/paginas', titleKey: 'sm_tile_pages_title', descKey: 'sm_tile_pages_desc' },
  { href: '/beheer/instituten', titleKey: 'sm_tile_institutions_title', descKey: 'sm_tile_institutions_desc' },
];

export const SiteManagement: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const user = useUser();
  const siteSlug = getSiteSlug();

  if (!user || !user.scope.includes('site.admin')) return <Navigate to="/" />;

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container">
          <header className="mb-8">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-3">{t('sm_title')}</h1>
            <p className="text-lg text-gray-600">{t('sm_intro')}</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TILES.map(tile => (
              <HrefLink
                key={tile.href}
                href={tile.href}
                className="block no-underline bg-white rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] p-6 transition-shadow duration-150 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
              >
                <h2 className="text-xl font-semibold text-[var(--cs-primary)] mb-2">{t(tile.titleKey)}</h2>
                <p className="text-sm text-gray-600 m-0">{t(tile.descKey)}</p>
              </HrefLink>
            ))}

            <a
              href={`/s/${siteSlug}/admin`}
              className="block no-underline bg-white rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] p-6 transition-shadow duration-150 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            >
              <h2 className="text-xl font-semibold text-[var(--cs-primary)] mb-2">{t('sm_tile_madoc_title')}</h2>
              <p className="text-sm text-gray-600 m-0">{t('sm_tile_madoc_desc')}</p>
            </a>
          </div>
        </div>
      </div>
    </CsPage>
  );
};
