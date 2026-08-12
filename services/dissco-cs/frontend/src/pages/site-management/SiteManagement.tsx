import React from 'react';
import { useTranslation } from 'react-i18next';
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
  { href: '/manage/projects', titleKey: 'sm_tile_projects_title', descKey: 'sm_tile_projects_desc' },
  { href: '/manage/announcements', titleKey: 'sm_tile_announcements_title', descKey: 'sm_tile_announcements_desc' },
  { href: '/manage/users', titleKey: 'sm_tile_users_title', descKey: 'sm_tile_users_desc' },
  { href: '/manage/pages', titleKey: 'sm_tile_pages_title', descKey: 'sm_tile_pages_desc' },
  { href: '/manage/institutions', titleKey: 'sm_tile_institutions_title', descKey: 'sm_tile_institutions_desc' },
];

export const SiteManagement: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const siteSlug = getSiteSlug();

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">
          <header className="mb-8">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-3">{t('sm_title')}</h1>
            <p className="text-lg text-gray-600">{t('sm_intro')}</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TILES.map(tile => {
              const tileContent = (
                <>
                  <h2 className="text-xl font-semibold text-[var(--cs-primary)] mb-2">{t(tile.titleKey)}</h2>
                  <p className="text-sm text-gray-600 m-0">{t(tile.descKey)}</p>
                </>
              );
              const tileClassName =
                'block no-underline bg-white border border-gray-200 rounded-[10px] p-6 transition-all duration-150 hover:border-[var(--cs-primary)] hover:shadow-[0_4px_14px_rgba(26,91,102,0.14)] hover:-translate-y-px';

              return tile.external ? (
                <a key={tile.href} href={tile.href} className={tileClassName}>
                  {tileContent}
                </a>
              ) : (
                <HrefLink key={tile.href} href={tile.href} className={tileClassName}>
                  {tileContent}
                </HrefLink>
              );
            })}

            <a
              href={`/s/${siteSlug}/admin`}
              className="block no-underline bg-white border border-gray-200 rounded-[10px] p-6 transition-all duration-150 hover:border-[var(--cs-primary)] hover:shadow-[0_4px_14px_rgba(26,91,102,0.14)] hover:-translate-y-px"
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
