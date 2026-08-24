import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MedalIcon } from '../../icons/MedalIcon';
import { useHonourBoard } from '../../hooks/use-honour-board';

type SpotlightPeriod = 'today' | 'week' | 'month' | 'legend';

interface SpotlightEntry {
  period: SpotlightPeriod;
  name: string;
  count: number;
}

const PERIODS: SpotlightPeriod[] = ['today', 'week', 'month', 'legend'];

const PERIOD_LABEL_KEY: Record<SpotlightPeriod, string> = {
  today: 'honour_board_period_today',
  week: 'honour_board_period_week',
  month: 'honour_board_period_month',
  legend: 'honour_board_period_legend',
};

const PERIOD_LINE_KEY: Record<SpotlightPeriod, string> = {
  today: 'honour_board_line_today',
  week: 'honour_board_line_week',
  month: 'honour_board_line_month',
  legend: 'honour_board_line_legend',
};

// "Featured" column: one hourly-rotating featured person on top, full 4-period list below.
export const HonourBoardSpotlight: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data: leaderboard, status } = useHonourBoard();
  const formatNumber = (n: number) => n.toLocaleString(i18n.language);

  if (status === 'loading') {
    return null;
  }

  const spotlight: SpotlightEntry[] = leaderboard
    ? PERIODS.reduce<SpotlightEntry[]>((acc, period) => {
        const entry = leaderboard[period].top[0];
        if (entry) acc.push({ period, name: entry.name, count: entry.count });
        return acc;
      }, [])
    : [];

  if (spotlight.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('honour_board_spotlight_title')}</div>
        </div>
        <p className="text-sm text-gray-400 text-center">{t('honour_board_spotlight_empty')}</p>
      </div>
    );
  }

  const featured = spotlight[new Date().getHours() % spotlight.length];

  return (
    <div className={className}>
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('honour_board_spotlight_title')}</div>
      </div>

      <div className="text-center pb-5 mb-5 border-b border-gray-100">
        <span className="inline-block text-xs font-bold uppercase tracking-wide text-[var(--cs-primary)] bg-[#eaf3f2] rounded-full px-2.5 py-1 mb-3">
          {t(PERIOD_LABEL_KEY[featured.period])}
        </span>
        <MedalIcon className="w-7 h-7 text-[var(--cs-primary)] mx-auto mb-2" aria-hidden="true" />
        <div className="text-2xl font-bold text-gray-800 mb-1.5">{featured.name}</div>
        <div className="text-sm text-gray-500">
          {t(PERIOD_LINE_KEY[featured.period], { value: formatNumber(featured.count) })}
        </div>
      </div>

      <ol className="list-none m-0 p-0 flex flex-col">
        {spotlight.map(entry => (
          <li key={entry.period} className="flex items-baseline gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
            <span className="whitespace-nowrap flex-shrink-0 w-[68px] text-[0.68rem] font-medium uppercase tracking-wide text-gray-400">
              {t(PERIOD_LABEL_KEY[entry.period])}
            </span>
            <span className="flex-1 text-sm text-gray-600">{entry.name}</span>
            <span className="text-xs text-gray-400 tabular-nums">{formatNumber(entry.count)}</span>
          </li>
        ))}
      </ol>

      <Link to="/honour-board" className="inline-block text-sm font-bold text-[var(--cs-primary)] no-underline hover:underline mt-4">
        {t('honour_board_spotlight_link')} →
      </Link>
    </div>
  );
};
