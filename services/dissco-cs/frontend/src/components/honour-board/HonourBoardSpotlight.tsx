import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MockBadge } from '../MockBadge';
import { MedalIcon } from '../../icons/MedalIcon';

type SpotlightPeriod = 'today' | 'week' | 'month' | 'legend';

interface SpotlightEntry {
  period: SpotlightPeriod;
  name: string;
  count: number;
}

// Voorbeelddata — er bestaat nog geen backend die dit aanlevert, zie docs/STATS-WIDGET.md.
const DEFAULT_SPOTLIGHT: SpotlightEntry[] = [
  { period: 'today', name: 'Dirk P.', count: 9 },
  { period: 'week', name: 'Ann V.', count: 140 },
  { period: 'month', name: 'Ben D.', count: 640 },
  { period: 'legend', name: 'Rony W.', count: 152057 },
];

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

/**
 * "Uitgelicht"-kolom: bovenaan één uitgelichte persoon (wisselt per uur, geen
 * client-side animatie), daaronder de volledige lijst met alle 4 periodes als
 * gedempte referentie — zelfde grammatica als het scorebord op de
 * instituutdetailpagina. Cijfers zijn voorbeelddata, zie docs/STATS-WIDGET.md.
 */
export const HonourBoardSpotlight: React.FC<{
  spotlight?: SpotlightEntry[];
  className?: string;
}> = ({ spotlight = DEFAULT_SPOTLIGHT, className = '' }) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const formatNumber = (n: number) => n.toLocaleString(i18n.language);

  const featured = spotlight[new Date().getHours() % spotlight.length] ?? spotlight[0];

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
      <div className="mt-2.5">
        <MockBadge label={t('institution_mock_badge')} />
      </div>
    </div>
  );
};
