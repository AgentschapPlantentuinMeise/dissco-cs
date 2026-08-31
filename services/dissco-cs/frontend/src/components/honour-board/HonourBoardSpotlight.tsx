import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LuMedal } from 'react-icons/lu';
import { useHonourBoard } from '../../hooks/use-honour-board';

type SpotlightPeriod = 'today' | 'week' | 'month' | 'legend';

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

// "Featured" column: one hourly-rotating featured person on top, full 4-period list below. Each
// period is an independent query (see useHonourBoard), so this renders progressively -- whichever
// period resolves first (usually "today", the smallest/fastest query) shows immediately instead
// of the whole widget waiting on the slowest one (legend, unfiltered). A period that resolves
// empty (nobody today/this week yet) still shows its row with a message instead of being hidden.
export const HonourBoardSpotlight: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const board = useHonourBoard();
  const formatNumber = (n: number) => n.toLocaleString(i18n.language);

  // Only periods that actually resolved with a top entry are candidates for the rotating featured
  // spot -- an empty or still-loading period would make a poor hero.
  const featuredCandidates = PERIODS.map(period => ({ period, entry: board[period].data?.top[0] })).filter(
    (c): c is { period: SpotlightPeriod; entry: NonNullable<(typeof c)['entry']> } => !!c.entry
  );

  const allSettled = PERIODS.every(period => board[period].status !== 'loading');
  const featured = featuredCandidates.length > 0 ? featuredCandidates[new Date().getHours() % featuredCandidates.length] : null;

  // Shell (title, hero slot, all 4 rows, link) always renders immediately -- no more blank space
  // while waiting on the first period. The hero slot itself has 3 states: a resolved leader, the
  // confirmed-empty message once every period has settled with nothing, or a loading placeholder
  // in between.
  return (
    <div className={`bg-[var(--cs-dark)] rounded-[4px] p-6 flex flex-col ${className}`}>
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[#9fc9c4]">{t('honour_board_spotlight_title')}</div>
      </div>

      <div className="text-center pb-5 mb-5 border-b border-white/10">
        {featured ? (
          <>
            <span className="inline-block text-xs font-bold uppercase tracking-wide text-[#eafcf9] bg-white/10 rounded-full px-2.5 py-1 mb-3">
              {t(PERIOD_LABEL_KEY[featured.period])}
            </span>
            <LuMedal className="w-7 h-7 text-white/90 mx-auto mb-2" aria-hidden="true" />
            <div className="text-2xl font-bold text-white mb-1.5">{featured.entry.name}</div>
            <div className="text-sm text-[#a9c9c5]">
              {t(PERIOD_LINE_KEY[featured.period], { value: formatNumber(featured.entry.count) })}
            </div>
          </>
        ) : (
          <>
            <LuMedal className="w-7 h-7 text-white/40 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-[#a9c9c5]">{t(allSettled ? 'honour_board_spotlight_empty' : 'card_loading')}</p>
          </>
        )}
      </div>

      <ol className="list-none m-0 p-0 flex flex-col">
        {PERIODS.map(period => {
          const result = board[period];
          const entry = result.data?.top[0];
          return (
            <li key={period} className="flex items-baseline gap-3 py-3.5 border-b border-white/10 last:border-b-0">
              <span className="whitespace-nowrap flex-shrink-0 w-[68px] text-[0.68rem] font-medium uppercase tracking-wide text-[#82a19c]">
                {t(PERIOD_LABEL_KEY[period])}
              </span>
              {result.status === 'loading' ? (
                <span className="flex-1 text-sm text-[#82a19c]">{t('card_loading')}</span>
              ) : entry ? (
                <>
                  <span className="flex-1 text-sm text-[#d3e8e5]">{entry.name}</span>
                  <span className="text-xs text-[#82a19c] tabular-nums">{formatNumber(entry.count)}</span>
                </>
              ) : (
                <span className="flex-1 text-sm text-[#82a19c]">{t('honour_board_spotlight_empty')}</span>
              )}
            </li>
          );
        })}
      </ol>

      <Link to="/honour-board" className="inline-block text-sm font-bold text-[#7fe0d4] no-underline hover:underline mt-4">
        {t('honour_board_spotlight_link')} →
      </Link>
    </div>
  );
};
