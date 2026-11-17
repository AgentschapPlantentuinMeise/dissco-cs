import { useTranslation } from 'react-i18next';
import { LuAward } from 'react-icons/lu';
import { Disclosure } from '../ui/Disclosure';
import { HonourBoardQuarter } from '../../hooks/use-site-honour-board';

// The names in a quarter's pool, closed by default: the bars on the line already show how many.
// Nothing at all while loading or when nobody is in the pool: the count is next to the quarter.
export function PoolNames({ quarter }: { quarter: HonourBoardQuarter }) {
  const { t } = useTranslation('dissco-cs');
  const pool = quarter.data?.pool ?? [];
  const youUrn = quarter.data?.you?.userUrn;
  const winnerUrn = quarter.data?.winner?.userUrn;

  if (pool.length === 0) {
    return null;
  }

  return (
    <Disclosure title={t('honour_board_pool_title', { count: pool.length })}>
      <ul className="list-none m-0 p-0 flex flex-wrap gap-1.5">
        {pool.map(entry => (
          <li
            key={entry.userUrn}
            className={`inline-flex items-center gap-1 text-[0.8rem] px-2.5 py-[3px] rounded-[3px] whitespace-nowrap ${
              entry.userUrn === winnerUrn
                ? 'bg-award-600 text-white font-semibold'
                : entry.userUrn === youUrn
                  ? 'bg-cs-secondary text-white font-semibold'
                  : 'bg-cs-primary/10 text-gray-900'
            }`}
          >
            {entry.userUrn === winnerUrn && <LuAward aria-label={t('honour_board_winner_label')} />}
            {entry.userUrn === youUrn ? t('honour_board_you') : entry.name}
          </li>
        ))}
      </ul>
    </Disclosure>
  );
}
