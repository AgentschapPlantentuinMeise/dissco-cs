import React from 'react';
import { useTranslation } from 'react-i18next';
import { HonourBoardEntry, HonourBoardPeriod } from '../../api/cs-api';

export const PeriodCard: React.FC<{
  titleKey: string;
  icon: React.ReactNode;
  period: HonourBoardPeriod | undefined;
  formatNumber: (n: number) => string;
  dark?: boolean;
  loading?: boolean;
}> = ({ titleKey, icon, period, formatNumber, dark = false, loading = false }) => {
  const { t } = useTranslation('dissco-cs');
  const rows: Array<{ entry: HonourBoardEntry; isYou: boolean }> = period
    ? period.top.map(entry => ({ entry, isYou: entry.userUrn === period.you?.userUrn }))
    : [];
  if (period?.you && !rows.some(row => row.isYou)) {
    rows.push({ entry: period.you, isYou: true });
  }

  return (
    <div className={`rounded-[4px] p-5 ${dark ? 'bg-[var(--cs-dark)]' : 'bg-white border border-gray-100'}`}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-[30px] h-[30px] rounded-[4px] flex items-center justify-center flex-shrink-0 ${dark ? 'bg-white/10 text-[#eafcf9]' : 'bg-[#eaf3f2] text-[var(--cs-accent)]'}`}>
          {icon}
        </div>
        <h3 className={`text-sm font-bold ${dark ? 'text-white' : 'text-[var(--cs-primary)]'}`}>{t(titleKey)}</h3>
      </div>

      {loading ? (
        <p className={`text-sm ${dark ? 'text-[#a9c9c5]' : 'text-gray-400'}`}>{t('card_loading')}</p>
      ) : rows.length === 0 ? (
        <p className={`text-sm ${dark ? 'text-[#a9c9c5]' : 'text-gray-400'}`}>{t('honour_board_spotlight_empty')}</p>
      ) : (
        <ol className="list-none m-0 p-0">
          {rows.map(({ entry, isYou }) => (
            <li
              key={entry.userUrn}
              className={`flex items-baseline gap-2.5 py-1.5 text-sm border-b last:border-b-0 ${dark ? 'border-white/10' : 'border-gray-100'} ${isYou ? (dark ? 'bg-white/10 rounded-[4px] px-1.5' : 'bg-[#eaf3f2] rounded-[4px] px-1.5') : ''}`}
            >
              <span className={`font-mono w-5 ${isYou ? (dark ? 'text-[#7fe0d4]' : 'text-[var(--cs-secondary)]') : (dark ? 'text-[#82a19c]' : 'text-gray-400')}`}>{entry.rank}</span>
              <span className={`flex-1 ${isYou ? `font-bold ${dark ? 'text-[#7fe0d4]' : 'text-[var(--cs-secondary)]'}` : (dark ? 'text-[#d3e8e5]' : 'text-gray-800')}`}>
                {isYou ? t('honour_board_you') : entry.name}
              </span>
              <span className={`tabular-nums ${dark ? 'text-[#82a19c]' : 'text-gray-500'}`}>{formatNumber(entry.count)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
