import React from 'react';
import { useTranslation } from 'react-i18next';
import { InstitutionDto } from '@dissco-cs/shared-types';
import { PageSection } from '../../components/layout/PageSection';
import { InstitutionCard } from '../../components/institutions/InstitutionCard';
import { CardStat } from '../../components/ui/CardStat';
import { formatNumber } from '../../utility/format-number';
import { sharePercentage } from './dashboard-tasks';

// "Institutions you helped": the institution cards, with the user's own tasks for each and the
// share of all that institution's completed tasks they make up. Who the work makes a difference
// for, whatever the collection.
export function InstitutionsHelped({ helped, children }: {
  helped: { institution: InstitutionDto; count: number }[];
  // Below the cards, e.g. the call to the forum.
  children?: React.ReactNode;
}) {
  const { t, i18n } = useTranslation('dissco-cs');

  return (
    <PageSection tone="white" title={t('dashboard_institutions_title')} intro={t('dashboard_institutions_intro')}>
      {helped.length === 0 ? (
        <p className="m-0 text-gray-500">{t('dashboard_institutions_empty')}</p>
      ) : (
        <div className="cs-card-grid">
          {helped.map(({ institution, count }) => (
            <InstitutionCard
              key={institution.id}
              institution={institution}
              footer={stats => {
                const share = sharePercentage(count, stats.tasksCompleted);
                return (
                  <>
                    <CardStat value={formatNumber(count, i18n.language)} label={t('dashboard_tasks_unit')} />
                    {share !== null && <span>{t('dashboard_institutions_share', { pct: formatNumber(Number(share), i18n.language) })}</span>}
                  </>
                );
              }}
            />
          ))}
        </div>
      )}
      {children}
    </PageSection>
  );
}
