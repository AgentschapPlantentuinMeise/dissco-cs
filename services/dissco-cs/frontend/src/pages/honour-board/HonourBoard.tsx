import React from 'react';
import { useTranslation } from 'react-i18next';
import { CsPage } from '../../components/CsPage';
import { StatBanner } from '../../components/StatBanner';
import { HonourBoardEntry, HonourBoardPeriod } from '../../api/cs-api';
import { useHonourBoard } from '../../hooks/use-honour-board';
import { useSiteStats } from '../../hooks/use-site-stats';
import { MedalIcon } from '../../icons/MedalIcon';
import { ClockIcon } from '../../icons/ClockIcon';
import { CalendarIcon } from '../../icons/CalendarIcon';

const PeriodCard: React.FC<{
  titleKey: string;
  icon: React.ReactNode;
  period: HonourBoardPeriod;
  formatNumber: (n: number) => string;
}> = ({ titleKey, icon, period, formatNumber }) => {
  const { t } = useTranslation('dissco-cs');
  const rows: Array<{ entry: HonourBoardEntry; isYou: boolean }> = period.top.map(entry => ({
    entry,
    isYou: entry.userUrn === period.you?.userUrn,
  }));
  if (period.you && !rows.some(row => row.isYou)) {
    rows.push({ entry: period.you, isYou: true });
  }

  return (
    <div className="bg-white rounded-[4px] border border-gray-100 p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-[30px] h-[30px] rounded-[4px] bg-[#eaf3f2] text-[var(--cs-accent)] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h3 className="text-sm font-bold text-[var(--cs-primary)]">{t(titleKey)}</h3>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">{t('honour_board_spotlight_empty')}</p>
      ) : (
        <ol className="list-none m-0 p-0">
          {rows.map(({ entry, isYou }) => (
            <li
              key={entry.userUrn}
              className={`flex items-baseline gap-2.5 py-1.5 text-sm border-b border-gray-100 last:border-b-0 ${isYou ? 'bg-[#eaf3f2] rounded-[4px] px-1.5' : ''}`}
            >
              <span className={`font-mono w-5 ${isYou ? 'text-[var(--cs-secondary)]' : 'text-gray-400'}`}>{entry.rank}</span>
              <span className={`flex-1 ${isYou ? 'font-bold text-[var(--cs-secondary)]' : 'text-gray-800'}`}>
                {isYou ? t('honour_board_you') : entry.name}
              </span>
              <span className="text-gray-500 tabular-nums">{formatNumber(entry.count)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export const HonourBoard: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data: leaderboard, status } = useHonourBoard();
  const { data: siteStats } = useSiteStats();
  const formatNumber = (n: number) => n.toLocaleString(i18n.language);
  const legendLeader = leaderboard?.legend.top[0];

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
                  <MedalIcon className="w-[18px] h-[18px] opacity-90" aria-hidden="true" />
                  <span>{t('honour_board_legend_headline', { name: legendLeader.name, value: formatNumber(legendLeader.count) })}</span>
                </div>
              )
            }
            trailingDivider
          />

          {status === 'loading' || !leaderboard ? (
            <p className="text-sm text-gray-400">{t('card_loading')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <PeriodCard
                titleKey="honour_board_period_today"
                icon={<ClockIcon className="w-4 h-4" />}
                period={leaderboard.today}
                formatNumber={formatNumber}
              />
              <PeriodCard
                titleKey="honour_board_period_week"
                icon={<CalendarIcon className="w-4 h-4" />}
                period={leaderboard.week}
                formatNumber={formatNumber}
              />
              <PeriodCard
                titleKey="honour_board_period_month"
                icon={<CalendarIcon className="w-4 h-4" />}
                period={leaderboard.month}
                formatNumber={formatNumber}
              />
            </div>
          )}
        </div>
      </div>
    </CsPage>
  );
};
