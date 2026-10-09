import React from 'react';
import { useTranslation } from 'react-i18next';
import { CsPage } from '../../components/layout/CsPage';
import { StatBanner } from '../../components/ui/StatBanner';
import { PeriodCard } from '../../components/stats/PeriodCard';
import { useSiteHonourBoard } from '../../hooks/use-site-honour-board';
import { useSiteStats } from '../../hooks/use-site-stats';
import { LuMedal, LuClock, LuCalendar } from 'react-icons/lu';
import { formatNumber as formatCount } from '../../utility/format-number';

export const HonourBoard: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { today, week, month, legend } = useSiteHonourBoard();
  const { data: siteStats } = useSiteStats();
  const formatNumber = (n: number) => formatCount(n, i18n.language);
  const legendLeader = legend.data?.top[0];

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container">
          <header className="mb-8">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-3">{t('honour_board_page_title')}</h1>
            <p className="text-lg text-gray-600">{t('honour_board_page_intro')}</p>
          </header>

          <StatBanner
            className="mb-8"
            stats={[
              { value: siteStats ? formatNumber(siteStats.volunteers) : '—', label: t('institution_stats_volunteers') },
              { value: siteStats ? formatNumber(siteStats.tasksCompleted) : '—', label: t('honour_board_stat_tasks_label') },
            ]}
            trailing={
              legendLeader && (
                <div className="flex items-center gap-2 text-sm">
                  <LuMedal className="w-[18px] h-[18px] opacity-90" aria-hidden="true" />
                  <span>{t('honour_board_legend_headline', { name: legendLeader.name, value: formatNumber(legendLeader.count) })}</span>
                </div>
              )
            }
            trailingDivider
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PeriodCard
              titleKey="honour_board_period_today"
              icon={<LuClock className="w-4 h-4" />}
              period={today.data}
              loading={today.status === 'pending'}
              formatNumber={formatNumber}
            />
            <PeriodCard
              titleKey="honour_board_period_week"
              icon={<LuCalendar className="w-4 h-4" />}
              period={week.data}
              loading={week.status === 'pending'}
              formatNumber={formatNumber}
            />
            <PeriodCard
              titleKey="honour_board_period_month"
              icon={<LuCalendar className="w-4 h-4" />}
              period={month.data}
              loading={month.status === 'pending'}
              formatNumber={formatNumber}
            />
          </div>
        </div>
      </div>
    </CsPage>
  );
};
