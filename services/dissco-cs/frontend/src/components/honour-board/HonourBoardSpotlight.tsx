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
      <div className={`bg-[var(--cs-dark)] rounded-[4px] p-6 flex flex-col ${className}`}>
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#9fc9c4]">{t('honour_board_spotlight_title')}</div>
        </div>
        <p className="text-sm text-[#a9c9c5] text-center">{t('honour_board_spotlight_empty')}</p>
      </div>
    );
  }

  const featured = spotlight[new Date().getHours() % spotlight.length];

  return (
    <div className={`bg-[var(--cs-dark)] rounded-[4px] p-6 flex flex-col ${className}`}>
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[#9fc9c4]">{t('honour_board_spotlight_title')}</div>
      </div>

      <div className="text-center pb-5 mb-5 border-b border-white/10">
        <span className="inline-block text-xs font-bold uppercase tracking-wide text-[#eafcf9] bg-white/10 rounded-full px-2.5 py-1 mb-3">
          {t(PERIOD_LABEL_KEY[featured.period])}
        </span>
        <MedalIcon className="w-7 h-7 text-white/90 mx-auto mb-2" aria-hidden="true" />
        <div className="text-2xl font-bold text-white mb-1.5">{featured.name}</div>
        <div className="text-sm text-[#a9c9c5]">
          {t(PERIOD_LINE_KEY[featured.period], { value: formatNumber(featured.count) })}
        </div>
      </div>

      <ol className="list-none m-0 p-0 flex flex-col">
        {spotlight.map(entry => (
          <li key={entry.period} className="flex items-baseline gap-3 py-3.5 border-b border-white/10 last:border-b-0">
            <span className="whitespace-nowrap flex-shrink-0 w-[68px] text-[0.68rem] font-medium uppercase tracking-wide text-[#82a19c]">
              {t(PERIOD_LABEL_KEY[entry.period])}
            </span>
            <span className="flex-1 text-sm text-[#d3e8e5]">{entry.name}</span>
            <span className="text-xs text-[#82a19c] tabular-nums">{formatNumber(entry.count)}</span>
          </li>
        ))}
      </ol>

      <Link to="/honour-board" className="inline-block text-sm font-bold text-[#7fe0d4] no-underline hover:underline mt-4">
        {t('honour_board_spotlight_link')} →
      </Link>
    </div>
  );
};
