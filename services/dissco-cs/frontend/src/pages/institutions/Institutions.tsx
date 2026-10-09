import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { institutionQueries } from '../../api/queries/institutions';
import { CsPage } from '../../components/layout/CsPage';
import { InstitutionCard } from '../../components/institutions/InstitutionCard';
import { StatBanner } from '../../components/ui/StatBanner';
import { HonourBoardSpotlight } from '../../components/stats/HonourBoardSpotlight';
import { useSiteStats } from '../../hooks/use-site-stats';
import { formatNumber } from '../../utility/format-number';

export const Institutions: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data } = useQuery(institutionQueries.active());
  const { data: siteStats } = useSiteStats();

  const institutions = data?.institutions ?? [];

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-x-8">

          <header className="mb-8 lg:col-span-2">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-3">{t('nav_institutions')}</h1>
            <p className="text-lg text-gray-600">{t('institutions_intro')}</p>
          </header>

          <div className="lg:col-start-1 lg:row-start-2 lg:self-start flex flex-col">
            <StatBanner
              stats={[
                { value: siteStats ? formatNumber(siteStats.volunteers, i18n.language) : '—', label: t('institution_stats_volunteers') },
                {
                  value: siteStats ? `${formatNumber(siteStats.tasksCompleted, i18n.language)} / ${formatNumber(siteStats.tasksTotal, i18n.language)}` : '—',
                  label: t('honour_board_stat_tasks_label'),
                },
              ]}
            />

            {institutions.length > 0 && (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {institutions.map(institution => (
                  <InstitutionCard key={institution.id} institution={institution} />
                ))}
              </div>
            )}
          </div>

          <HonourBoardSpotlight className="mt-8 lg:mt-0 lg:col-start-2 lg:row-start-2" />

        </div>
      </div>
    </CsPage>
  );
};
