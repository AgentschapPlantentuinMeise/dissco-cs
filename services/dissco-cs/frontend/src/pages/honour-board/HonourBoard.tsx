import React from 'react';
import { useTranslation } from 'react-i18next';
import { CsPage } from '../../components/CsPage';

interface BoardEntry {
  rank: number;
  name: string;
  count: number;
  isYou?: boolean;
}

// Voorbeelddata — er bestaat nog geen per-gebruiker, per-periode aggregatie (zie docs/STATS-WIDGET.md).
const TODAY: BoardEntry[] = [
  { rank: 1, name: 'Luc S.', count: 14 },
  { rank: 2, name: 'Ann V.', count: 9 },
  { rank: 3, name: 'Dirk P.', count: 7 },
  { rank: 12, name: 'Jij', count: 2, isYou: true },
];
const WEEK: BoardEntry[] = [
  { rank: 1, name: 'Luc S.', count: 220 },
  { rank: 2, name: 'Ben D.', count: 180 },
  { rank: 3, name: 'Ann V.', count: 140 },
  { rank: 24, name: 'Jij', count: 18, isYou: true },
];
const MONTH: BoardEntry[] = [
  { rank: 1, name: 'Luc S.', count: 708 },
  { rank: 2, name: 'Ben D.', count: 640 },
  { rank: 3, name: 'Femke K.', count: 590 },
  { rank: 31, name: 'Jij', count: 42, isYou: true },
];
const LEGEND: BoardEntry[] = [
  { rank: 1, name: 'Rony W.', count: 152057 },
  { rank: 2, name: 'Luc S.', count: 98400 },
  { rank: 3, name: 'Els T.', count: 61220 },
  { rank: 140, name: 'Jij', count: 312, isYou: true },
];

const BoardColumn: React.FC<{ titleKey: string; entries: BoardEntry[]; formatNumber: (n: number) => string }> = ({ titleKey, entries, formatNumber }) => {
  const { t } = useTranslation('dissco-cs');
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide font-extrabold text-[var(--cs-primary)] mb-3">{t(titleKey)}</h3>
      <ol className="list-none m-0 p-0">
        {entries.map(entry => (
          <li
            key={entry.rank}
            className={`flex items-baseline gap-2 py-1.5 text-sm border-b border-gray-100 last:border-b-0 ${entry.isYou ? 'bg-[#eaf3f2] rounded px-1.5' : ''}`}
          >
            <span className={`font-mono w-6 ${entry.isYou ? 'text-[var(--cs-primary)]' : 'text-gray-400'}`}>{entry.rank}</span>
            <span className={`flex-1 ${entry.isYou ? 'font-bold text-[var(--cs-primary)]' : 'text-gray-800'}`}>{entry.name}</span>
            <span className="text-gray-500 tabular-nums">{formatNumber(entry.count)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export const HonourBoard: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const formatNumber = (n: number) => n.toLocaleString(i18n.language);

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container">
          <header className="mb-8">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-3">{t('honour_board_page_title')}</h1>
            <p className="text-lg text-gray-600">{t('honour_board_page_intro')}</p>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <BoardColumn titleKey="honour_board_period_today" entries={TODAY} formatNumber={formatNumber} />
            <BoardColumn titleKey="honour_board_period_week" entries={WEEK} formatNumber={formatNumber} />
            <BoardColumn titleKey="honour_board_period_month" entries={MONTH} formatNumber={formatNumber} />
            <BoardColumn titleKey="honour_board_period_legend" entries={LEGEND} formatNumber={formatNumber} />
          </div>
        </div>
      </div>
    </CsPage>
  );
};
