import { useTranslation } from 'react-i18next';
import { LuAward, LuGift } from 'react-icons/lu';
import { siteLangText } from '../../utility/site-lang-text';
import { HonourBoardQuarter } from '../../hooks/use-site-honour-board';
import { barHeight, barsInOrder, barTop, progressToThreshold, quarterLabel, showYouLabel } from './honour-board-timeline';
import { formatDayMonth } from '../../utility/format-date';

// The tallest bar in px; the area above it keeps room for the "you" label.
const BAR_AREA = 64;

const FILL: Record<HonourBoardQuarter['kind'], string> = {
  past: 'bg-cs-primary',
  current: 'bg-cs-secondary',
};

// The bars of the others: darker for who did more than you, lighter for who did fewer, so you see
// where you stand; one tint when you have no tasks this quarter or are not logged in.
const OTHERS: Record<HonourBoardQuarter['kind'], Record<'more' | 'fewer' | 'all', string>> = {
  past: { more: 'bg-cs-primary/75', fewer: 'bg-cs-primary/35', all: 'bg-cs-primary/55' },
  current: { more: 'bg-cs-secondary/75', fewer: 'bg-cs-secondary/35', all: 'bg-cs-secondary/55' },
};

// The last four quarters as one line, each a toggle that selects it. Above each part
// of the line, one bar per volunteer in that quarter's pool, from fewest to most tasks; your own
// bar stands out with "you" above it, the winner's in amber with an award (which wins when both
// labels would meet).
// Below the running quarter what there is to win, when a site admin set it.
export function QuarterStrip({ board, selected, onSelect }: {
  board: HonourBoardQuarter[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const { t, i18n } = useTranslation('dissco-cs');
  const dayMonth = (date: Date) => formatDayMonth(date, i18n.language, 'short');

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3">
      {board.map((quarter, index) => {
        const pool = quarter.data?.pool ?? [];
        const you = quarter.data?.you;
        const winner = quarter.data?.winner;
        const prize = quarter.data?.prize;
        const withPrize = quarter.data?.mode === 'prize';
        const threshold = quarter.data?.threshold ?? 0;
        const bars = barsInOrder(pool);
        const top = barTop(pool.map(entry => entry.count), threshold);
        const youLabel = showYouLabel(bars, you?.userUrn, winner?.userUrn);
        const meta = quarter.pending
          ? t('common_loading')
          : quarter.kind === 'past'
            ? t('honour_board_pool_count', { count: pool.length })
            : t('honour_board_quarter_running', { days: quarter.daysLeft, count: pool.length });

        // A <button> centres its content vertically; the grid stretches all four to the tallest, so
        // without flex-col a quarter with an extra line would sit its line higher than the others.
        return (
          <button
            key={quarter.key}
            type="button"
            aria-pressed={index === selected}
            onClick={() => onSelect(index)}
            className="group relative min-w-0 flex flex-col justify-start text-left pr-3 pb-3 bg-transparent cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cs-accent"
          >
            <div aria-hidden="true" className="h-20 pt-4 mb-2 pl-0.5 flex items-end gap-0.5 overflow-hidden">
              {bars.map(entry => {
                const isYou = entry.userUrn === you?.userUrn;
                const isWinner = entry.userUrn === winner?.userUrn;
                const name = isYou ? t('honour_board_you') : entry.name;
                return (
                  <i
                    key={entry.userUrn}
                    title={t(isWinner ? 'honour_board_bar_title_winner' : 'honour_board_bar_title', { name, count: entry.count })}
                    style={{ height: `${Math.round(barHeight(entry.count, threshold, top) * BAR_AREA)}px` }}
                    className={`relative block flex-1 min-w-[2px] max-w-[9px] rounded-t-[2px] ${
                      isWinner
                        ? 'bg-award-600 outline outline-2 outline-offset-1 outline-award-600'
                        : isYou
                          ? 'bg-cs-secondary outline outline-2 outline-offset-1 outline-cs-secondary'
                          : OTHERS[quarter.kind][!you || you.count === 0 ? 'all' : entry.count > you.count ? 'more' : 'fewer']
                    }`}
                  >
                    {isWinner && (
                      <LuAward aria-hidden="true" className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-3 h-3 text-award-700" />
                    )}
                    {isYou && youLabel && (
                      <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[0.66rem] font-bold not-italic text-cs-secondary whitespace-nowrap">
                        {t('honour_board_you')}
                      </span>
                    )}
                  </i>
                );
              })}
            </div>

            {/* The line runs on to the next quarter; the tick at its right end is this quarter's last day. */}
            <div className="relative h-1 -mr-3 mb-2.5 bg-cs-primary/15">
              <div className={`absolute inset-y-0 left-0 ${FILL[quarter.kind]}`} style={{ width: `${quarter.progress * 100}%` }} />
              {quarter.kind === 'current' && (
                <span
                  className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-cs-secondary border-[3px] border-white -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${quarter.progress * 100}%` }}
                />
              )}
              <span className={`absolute right-0 -top-[7px] w-0.5 h-[18px] ${quarter.kind === 'past' ? 'bg-cs-primary' : 'bg-cs-primary/25'}`} />
            </div>

            <div className="pl-0.5">
              <span className="text-[0.92rem] font-bold text-gray-900 group-hover:underline">
                {quarterLabel(quarter.key)}
              </span>
              <span className="ml-1 text-[0.76rem] text-gray-500">{t('honour_board_quarter_until', { date: dayMonth(quarter.lastDay) })}</span>
            </div>
            <div className={`pl-0.5 mt-0.5 text-[0.78rem] ${quarter.kind === 'current' ? 'text-cs-secondary font-semibold' : 'text-gray-500'}`}>
              {meta}
            </div>
            {quarter.kind === 'past' && you && you.count > 0 && (
              winner?.userUrn === you.userUrn ? (
                <div className="pl-0.5 mt-0.5 flex items-center gap-1 text-[0.74rem] font-semibold text-award-700">
                  <LuAward aria-hidden="true" className="shrink-0" />
                  {t('honour_board_you_count_winner', { count: you.count })}
                </div>
              ) : (
                <div className="pl-0.5 mt-0.5 text-[0.74rem] font-semibold text-cs-secondary">
                  {t(progressToThreshold(you.count, threshold).toGo === 0 ? 'honour_board_you_count' : 'honour_board_you_count_below', { count: you.count })}
                </div>
              )
            )}
            {withPrize && quarter.kind === 'current' && prize && (
              <div className="pl-0.5 mt-1 flex items-start gap-1 text-[0.76rem] text-cs-primary">
                <LuGift aria-hidden="true" className="shrink-0 mt-0.5" />
                <span>{t('honour_board_prize_line', { prize: siteLangText(prize.title, i18n.language, '') })}</span>
              </div>
            )}
            {withPrize && quarter.kind === 'past' && !winner && (
              <div className="pl-0.5 mt-0.5 text-[0.74rem] text-gray-500">{t('honour_board_winner_pending')}</div>
            )}

            {/* The selected quarter is marked like a tab: only a line below it, no surface of its own. */}
            {index === selected && <span className="absolute left-0 right-3 bottom-0 h-[3px] bg-cs-secondary" />}
          </button>
        );
      })}
    </div>
  );
}
