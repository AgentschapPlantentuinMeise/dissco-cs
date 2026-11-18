import React from 'react';
import { useTranslation } from 'react-i18next';

// Takes the place of one part of a page while it loads; the same size as SectionLoadError, so
// nothing jumps when the load fails. Compact for narrow places such as the side panels on the
// annotate page.
export function LoadingText({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation('dissco-cs');
  return (
    <p role="status" className={compact ? 'm-0 text-gray-500' : 'py-8 text-center text-gray-500 m-0'}>
      {t('common_loading')}
    </p>
  );
}
