import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { CsPage } from '../../components/CsPage';
import { InstitutionCard } from '../../components/institutioncard/InstitutionCard';
import { institutionsApi } from '../../api/cs-api';
import { StatBanner } from '../../components/StatBanner';
import { MockBadge } from '../../components/MockBadge';
import { HonourBoardSpotlight } from '../../components/honour-board/HonourBoardSpotlight';

// Voorbeelddata tot de site-brede statistieken een echte databron hebben (zie docs/STATS-WIDGET.md).
const EXAMPLE_VOLUNTEERS = 412;
const EXAMPLE_TASKS_LABEL = '18.640 / 26.900';

export const Institutions: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data } = useQuery('institutions-active', () => institutionsApi.listActive());
  const formatNumber = (n: number) => n.toLocaleString(i18n.language);

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
                { value: formatNumber(EXAMPLE_VOLUNTEERS), label: t('institution_stats_volunteers') },
                { value: EXAMPLE_TASKS_LABEL, label: t('honour_board_stat_tasks_label') },
              ]}
              trailing={<MockBadge label={t('institution_mock_badge')} />}
            />

            {institutions.length > 0 && (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {institutions.map(institution => (
                  <InstitutionCard key={institution.id} institution={institution} />
                ))}
              </div>
            )}
          </div>

          <HonourBoardSpotlight className="mt-8 lg:mt-6 lg:col-start-2 lg:row-start-2 lg:self-start" />

        </div>
      </div>
    </CsPage>
  );
};
