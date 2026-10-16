import { useTranslation } from 'react-i18next';

interface ReviewCountSummaryProps {
  visibleCount: number;
  totalCount: number;
  className?: string;
}

// With a submitter filter, visibleCount goes down while totalCount stays the number of the
// reviewer's own tasks. Shown next to the search bar, so it stays in view with a long list.
export function ReviewCountSummary({ visibleCount, totalCount, className = '' }: ReviewCountSummaryProps) {
  const { t } = useTranslation('dissco-cs');
  return (
    <p className={`text-sm text-gray-500 whitespace-nowrap ${className}`}>
      {t('review_count_summary', { count: visibleCount, total: totalCount })}
    </p>
  );
}
