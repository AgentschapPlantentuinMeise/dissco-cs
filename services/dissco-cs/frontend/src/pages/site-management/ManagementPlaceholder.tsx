import React from 'react';
import { useTranslation } from 'react-i18next';
import { HrefLink } from '../../utility/href-link';
import { CsPage } from '../../components/CsPage';
import { ArrowLeftIcon } from '../../icons/ArrowLeftIcon';

export function ManagementPlaceholder({ title }: { title: string }) {
  const { t } = useTranslation('dissco-cs');

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container">
          <HrefLink href="/beheer" className="inline-flex items-center gap-1 text-[var(--cs-primary)] no-underline font-medium hover:underline">
            <ArrowLeftIcon aria-hidden="true" /> {t('sm_back_to_hub')}
          </HrefLink>

          <h1 className="text-3xl text-[var(--cs-primary)] mt-4 mb-4">{title}</h1>
          <p className="text-base text-gray-600">{t('sm_placeholder_text')}</p>
        </div>
      </div>
    </CsPage>
  );
}
