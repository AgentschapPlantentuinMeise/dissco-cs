import { useTranslation } from 'react-i18next';
import { LuMedal } from 'react-icons/lu';
import { HonourBoardPeriodKey } from '@dissco-cs/shared-types';
import { PageSection } from '../layout/PageSection';
import { useHonourBoardPeriods } from '../../hooks/use-honour-board-periods';
import { useCurrentUser } from '../../hooks/use-current-user';
import { HrefLink } from '../../utility/href-link';
import { formatNumber } from '../../utility/format-number';
import { currentLocation, withQuery } from '../../api/url';
import { pickFeatured, rowsWithYou } from './honour-board-band';

type HonourBoard = ReturnType<typeof useHonourBoardPeriods>;

const COLUMN_PERIODS: HonourBoardPeriodKey[] = ['today', 'week', 'month'];
const ALL_PERIODS: HonourBoardPeriodKey[] = [...COLUMN_PERIODS, 'legend'];
const TOP_N = 3;

const PERIOD_LABEL_KEY: Record<HonourBoardPeriodKey, string> = {
  today: 'honour_board_period_today',
  week: 'honour_board_period_week',
  month: 'honour_board_period_month',
  legend: 'honour_board_period_legend',
};

const PERIOD_LINE_KEY: Record<HonourBoardPeriodKey, string> = {
  today: 'honour_board_line_today',
  week: 'honour_board_line_week',
  month: 'honour_board_line_month',
  legend: 'honour_board_line_legend',
};

/**
 * The light Honour Board band at the bottom of a page: the volunteer in the spotlight (taking turns
 * by the hour), the top 3 of today, this week and this month with your own place, and the legend.
 * `board` comes from useHonourBoardPeriods: for the whole site, or for one institution.
 */
export function HonourBoardBand({ board }: { board: HonourBoard }) {
  const { t, i18n } = useTranslation('dissco-cs');
  const user = useCurrentUser();
  const format = (n: number) => formatNumber(n, i18n.language);

  const featured = pickFeatured(ALL_PERIODS.map(period => ({ period, data: board[period].data })), new Date().getHours());
  const allSettled = ALL_PERIODS.every(period => board[period].status !== 'pending');
  const legendLeader = board.legend.data?.top[0];

  return (
    <PageSection tone="tint" title={t('honour_board_band_intro')}>
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,250px)] gap-6 items-start lg:items-stretch">
        {COLUMN_PERIODS.map(period => (
          <HonourBoardColumn key={period} label={t(PERIOD_LABEL_KEY[period])} result={board[period]} format={format} />
        ))}

        <div className="min-w-0 bg-white rounded-[4px] border-b-[3px] border-cs-primary px-5 py-[18px] flex flex-col items-center justify-center gap-1.5 text-center">
          {featured ? (
            <>
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-cs-primary bg-cs-primary/10 rounded-full px-2.5 py-[3px]">
                {t('honour_board_band_featured')}
              </span>
              <LuMedal className="w-[26px] h-[26px] text-cs-primary" aria-hidden="true" />
              <span className="max-w-full truncate text-[1.35rem] font-bold text-gray-900" title={featured.entry.name}>
                {featured.entry.name}
              </span>
              <span className="text-[0.84rem] text-gray-600">
                {t(PERIOD_LINE_KEY[featured.period], { value: format(featured.entry.count) })}
              </span>
            </>
          ) : (
            <>
              <LuMedal className="w-[26px] h-[26px] text-cs-primary/40" aria-hidden="true" />
              <span className="text-sm text-gray-600">{t(allSettled ? 'honour_board_empty' : 'card_loading')}</span>
            </>
          )}
        </div>

        {/* Left out while the legend itself is in the spotlight: it would say the same twice. */}
        {legendLeader && featured?.period !== 'legend' && (
          <div className="col-span-full flex flex-wrap items-center gap-2 pt-3.5 border-t border-cs-primary/15 text-[0.92rem]">
            <LuMedal className="w-[18px] h-[18px] text-cs-primary" aria-hidden="true" />
            <span>
              <b>{t('honour_board_band_legend_label')}</b>{' '}
              {t('honour_board_legend_headline', { name: legendLeader.name, value: format(legendLeader.count) })}
            </span>
          </div>
        )}

        {!user && (
          <p className="col-span-full text-[0.84rem] text-gray-600 m-0">
            <HrefLink href={withQuery('/login', { redirect: currentLocation() })} className="text-cs-primary font-semibold">
              {t('honour_board_band_login')}
            </HrefLink>
          </p>
        )}
      </div>
    </PageSection>
  );
}

function HonourBoardColumn({ label, result, format }: {
  label: string;
  result: HonourBoard[HonourBoardPeriodKey];
  format: (n: number) => string;
}) {
  const { t } = useTranslation('dissco-cs');
  const rows = rowsWithYou(result.data, TOP_N);

  return (
    <div className="min-w-0">
      <h3 className="m-0 mb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.05em] text-gray-600">{label}</h3>
      {result.status === 'pending' ? (
        <p className="text-sm text-gray-500 m-0 py-2">{t('card_loading')}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 m-0 py-2">{t('honour_board_empty')}</p>
      ) : (
        <ol className="list-none m-0 p-0">
          {rows.map(({ entry, isYou, isExtra }) => (
            <li
              key={entry.userUrn}
              className={`grid grid-cols-[18px_minmax(0,1fr)_auto] gap-2 items-center py-2 text-[0.9rem] ${
                isExtra ? 'border-t border-dashed border-cs-primary/30 mt-0.5' : 'border-b border-cs-primary/15 last:border-b-0'
              } ${isYou && !isExtra ? 'bg-cs-primary/10 px-1.5 -mx-1.5 rounded-[4px]' : ''}`}
            >
              <span className="text-[0.78rem] text-gray-500 tabular-nums">
                {entry.rank === 1 ? <LuMedal className="w-4 h-4 text-cs-primary block" aria-label="1" /> : entry.rank}
              </span>
              <span
                className={`truncate ${entry.rank === 1 || isYou ? 'font-semibold' : ''} ${isYou ? 'text-cs-primary' : ''}`}
                title={isYou ? undefined : entry.name}
              >
                {isYou ? t('honour_board_you') : entry.name}
              </span>
              <span className="text-[0.8rem] font-semibold text-cs-primary tabular-nums">{format(entry.count)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
