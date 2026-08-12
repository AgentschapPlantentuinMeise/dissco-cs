import React from 'react';
import { useTranslation } from 'react-i18next';

interface ReviewCountSummaryProps {
  visibleCount: number;
  totalCount: number;
  className?: string;
}

// Werkt ook als overzicht bij een indiener-filter, aangezien filterBySubmitter gewoon de zoekopdracht instelt --
// visibleCount daalt dan mee, totalCount blijft het totaal aantal eigen review-taken. Staat naast
// de zoek/filterbalk (niet onderaan de pagina) zodat hij bij een lange wachtrij meteen zichtbaar
// blijft zonder scrollen.
export function ReviewCountSummary({ visibleCount, totalCount, className = '' }: ReviewCountSummaryProps) {
  const { t } = useTranslation('dissco-cs');
  return (
    <p className={`text-sm text-gray-500 whitespace-nowrap ${className}`}>
      {t('review_count_summary', { count: visibleCount, total: totalCount })}
    </p>
  );
}
