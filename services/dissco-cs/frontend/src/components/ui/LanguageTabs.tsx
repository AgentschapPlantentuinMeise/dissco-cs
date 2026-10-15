import React from 'react';
import { useTranslation } from 'react-i18next';
import { SitePageLang } from '@dissco-cs/shared-types';
import { LANGUAGES } from '../../utility/site-lang-text';

// The row of language buttons above a multilingual form (one per site language). `isMissing`
// marks a language that still needs content with a small dot.
export const LanguageTabs: React.FC<{
  selected: SitePageLang;
  onSelect: (lang: SitePageLang) => void;
  isMissing?: (lang: SitePageLang) => boolean;
}> = ({ selected, onSelect, isMissing }) => {
  const { t } = useTranslation('dissco-cs');

  return (
    <div className="flex gap-2 mb-4">
      {LANGUAGES.map(({ code }) => (
        <button
          key={code}
          type="button"
          onClick={() => onSelect(code)}
          className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1.5 ${
            selected === code
              ? 'bg-[var(--cs-primary)] text-white border-[var(--cs-primary)]'
              : 'bg-transparent text-gray-600 border-gray-300'
          }`}
        >
          {t(`lang_${code}`)}
          {isMissing?.(code) && (
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selected === code ? 'bg-white' : 'bg-red-500'}`}
              title={t('common_lang_missing')}
            />
          )}
        </button>
      ))}
    </div>
  );
};
