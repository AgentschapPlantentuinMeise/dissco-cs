import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuX } from 'react-icons/lu';

interface ReviewSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ReviewSearchInput({ value, onChange }: ReviewSearchInputProps) {
  const { t } = useTranslation('dissco-cs');
  return (
    <div className="relative flex-1 min-w-[200px]">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={t('review_search_placeholder')}
        className="w-full border border-gray-300 rounded-lg p-2 pr-8"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('common_close')}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-gray-400 hover:text-[var(--cs-primary)] cursor-pointer p-1"
        >
          <LuX />
        </button>
      )}
    </div>
  );
}
