import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuCheck } from 'react-icons/lu';

// The confirmation after a save: next to the Save button of a form that stays open, or in the row
// of a list that was just saved. role="status" lets a screen reader announce it.
export function SavedNotice({ children }: { children?: React.ReactNode }) {
  const { t } = useTranslation('dissco-cs');
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
      <LuCheck aria-hidden="true" className="flex-shrink-0" />
      {children ?? t('common_saved')}
    </span>
  );
}
