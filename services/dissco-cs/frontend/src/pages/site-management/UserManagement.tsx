import React from 'react';
import { useTranslation } from 'react-i18next';
import { getSiteSlug } from '../../api/slug';
import { HrefLink } from '../../utility/href-link';
import { CsPage } from '../../components/CsPage';
import { ArrowLeftIcon } from '../../icons/ArrowLeftIcon';

export const UserManagement: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const siteSlug = getSiteSlug();

  const tileClassName =
    'block no-underline bg-white border border-gray-200 rounded-[10px] p-6 transition-all duration-150 hover:border-[var(--cs-primary)] hover:shadow-[0_4px_14px_rgba(26,91,102,0.14)] hover:-translate-y-px';

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">
          <HrefLink
            href="/manage"
            className="inline-flex items-center gap-1 text-[var(--cs-primary)] no-underline font-medium hover:underline"
          >
            <ArrowLeftIcon aria-hidden="true" /> {t('sm_back_to_hub')}
          </HrefLink>

          <h1 className="text-3xl text-[var(--cs-primary)] mt-4 mb-8">{t('sm_tile_users_title')}</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <a href={`/s/${siteSlug}/admin/site/permissions`} className={tileClassName}>
              <h2 className="text-xl font-semibold text-[var(--cs-primary)] mb-2">{t('sm_tile_site_permissions_title')}</h2>
              <p className="text-sm text-gray-600 m-0">{t('sm_tile_site_permissions_desc')}</p>
            </a>

            <a href={`/s/${siteSlug}/admin/global/users`} className={tileClassName}>
              <h2 className="text-xl font-semibold text-[var(--cs-primary)] mb-2">{t('sm_tile_user_accounts_title')}</h2>
              <p className="text-sm text-gray-600 m-0">{t('sm_tile_user_accounts_desc')}</p>
            </a>
          </div>
        </div>
      </div>
    </CsPage>
  );
};
