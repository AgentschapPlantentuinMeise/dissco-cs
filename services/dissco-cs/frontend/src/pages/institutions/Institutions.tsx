import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { CsPage } from '../../components/CsPage';
import { InstitutionCard } from '../../components/institutioncard/InstitutionCard';
import { institutionsApi } from '../../api/cs-api';

export const Institutions: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const { data } = useQuery('institutions-active', () => institutionsApi.listActive());

  const institutions = data?.institutions ?? [];

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">

          <header className="mb-8">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-3">{t('nav_institutions')}</h1>
            <p className="text-lg text-gray-600">{t('institutions_intro')}</p>
          </header>

          {institutions.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {institutions.map(institution => (
                <InstitutionCard key={institution.id} institution={institution} />
              ))}
            </div>
          )}

        </div>
      </div>
    </CsPage>
  );
};
