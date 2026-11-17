import { useTranslation } from 'react-i18next';
import { LuCheck } from 'react-icons/lu';
import { formatNumber } from '../../utility/format-number';
import { progressToThreshold } from './honour-board-timeline';
import { IconCircle } from './IconCircle';

// The logged-in volunteer's own tasks in the running quarter, against the threshold of the pool.
export function YourProgress({ count, threshold, daysLeft }: { count: number; threshold: number; daysLeft: number }) {
  const { t, i18n } = useTranslation('dissco-cs');
  const format = (n: number) => formatNumber(n, i18n.language);
  const { toGo, percent } = progressToThreshold(count, threshold);

  if (toGo === 0) {
    return (
      <div className="flex items-center gap-3.5">
        <IconCircle tone="in">
          <LuCheck className="w-4 h-4" aria-hidden="true" />
        </IconCircle>
        <p className="m-0 text-[0.92rem]">
          <b className="text-gray-900">{t('honour_board_progress_in')}</b>{' '}
          {t('honour_board_progress_in_detail', { count: format(count), threshold: format(threshold) })}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3.5 items-center">
      <span className="text-[1.6rem] font-bold text-cs-secondary tabular-nums leading-none">{format(count)}</span>
      <div className="text-[0.92rem]">
        <b className="text-gray-900">{t('honour_board_progress_to_go', { toGo: format(toGo), days: daysLeft })}</b>
        <div
          role="progressbar"
          aria-label={t('honour_board_progress_label')}
          aria-valuemin={0}
          aria-valuemax={threshold}
          aria-valuenow={count}
          className="h-2 mt-2 bg-cs-primary/10 rounded overflow-hidden"
        >
          <div className="h-full bg-cs-secondary" style={{ width: `${percent}%` }} />
        </div>
        <div className="flex justify-between mt-0.5 text-[0.7rem] text-gray-500 tabular-nums">
          <span>0</span>
          <span>{t('honour_board_progress_threshold', { threshold: format(threshold) })}</span>
        </div>
      </div>
    </div>
  );
}
