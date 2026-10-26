import { useTranslation } from 'react-i18next';
import { PageSection } from '../../components/layout/PageSection';
import { formatNumber } from '../../utility/format-number';
import { bestMonth, MonthCount, nextMilestone } from './dashboard-tasks';

const factClass = 'flex flex-col border-l-[3px] border-cs-primary pl-3.5';
const factValueClass = 'text-[1.35rem] font-semibold leading-tight text-gray-900';

// "Your year": the done tasks per month as bars, when the user started, their best month and the
// next milestone. Only counts and dates, so it works for any kind of collection.
export function YourYear({ months, first, doneCount }: { months: MonthCount[]; first: number | null; doneCount: number }) {
  const { t, i18n } = useTranslation('dissco-cs');
  const monthName = (month: MonthCount, style: 'short' | 'long') =>
    new Date(month.year, month.month, 1).toLocaleDateString(i18n.language, { month: style });
  const highest = Math.max(1, ...months.map(month => month.count));
  const best = bestMonth(months);
  const milestone = nextMilestone(doneCount);
  const milestoneWidth = Math.round(((doneCount - milestone.previous) / (milestone.next - milestone.previous)) * 100);

  return (
    <PageSection title={t('dashboard_year_title')} intro={t('dashboard_year_intro')}>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-10 items-start">
        {best ? (
          <div>
            <ol className="list-none m-0 p-0 grid grid-cols-12 gap-1.5 items-end h-36 border-b border-gray-200">
              {months.map(month => (
                <li
                  key={`${month.year}-${month.month}`}
                  className={`rounded-t-[3px] ${month.count ? 'bg-cs-primary' : 'bg-gray-200'}`}
                  style={{ height: month.count ? `${Math.round((month.count / highest) * 100)}%` : '2px' }}
                  title={t('dashboard_year_bar_label', { month: monthName(month, 'long'), count: month.count })}
                  aria-label={t('dashboard_year_bar_label', { month: monthName(month, 'long'), count: month.count })}
                />
              ))}
            </ol>
            <div aria-hidden="true" className="grid grid-cols-12 gap-1.5 mt-1.5 text-[0.7rem] text-gray-500 text-center">
              {months.map(month => (
                <span key={`${month.year}-${month.month}`}>{monthName(month, 'short')}</span>
              ))}
            </div>
          </div>
        ) : (
          <p className="m-0 text-gray-500">{t('dashboard_year_empty')}</p>
        )}

        <div className="flex flex-col gap-4">
          {first && (
            <div className={factClass}>
              <span className={factValueClass}>{new Date(first).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}</span>
              <span className="text-sm text-gray-500">{t('dashboard_year_first')}</span>
            </div>
          )}
          {best && (
            <div className={factClass}>
              <span className={factValueClass}>{monthName(best, 'long')}</span>
              <span className="text-sm text-gray-500">{t('dashboard_year_best', { count: best.count })}</span>
            </div>
          )}
          <div className={factClass}>
            <span className={factValueClass}>{t('dashboard_year_milestone_title', { next: formatNumber(milestone.next, i18n.language) })}</span>
            <span className="text-sm text-gray-500">{t('dashboard_year_milestone', { left: formatNumber(milestone.next - doneCount, i18n.language) })}</span>
            <div
              className="h-2 mt-2 mb-1 bg-gray-200 rounded overflow-hidden"
              role="progressbar"
              aria-valuemin={milestone.previous}
              aria-valuemax={milestone.next}
              aria-valuenow={doneCount}
            >
              <div className="h-full bg-cs-secondary" style={{ width: `${milestoneWidth}%` }} />
            </div>
            <div className="flex justify-between text-[0.72rem] text-gray-500 tabular-nums">
              <span>{formatNumber(milestone.previous, i18n.language)}</span>
              <span>{t('dashboard_year_now', { done: formatNumber(doneCount, i18n.language) })}</span>
              <span>{formatNumber(milestone.next, i18n.language)}</span>
            </div>
          </div>
        </div>
      </div>
    </PageSection>
  );
}
