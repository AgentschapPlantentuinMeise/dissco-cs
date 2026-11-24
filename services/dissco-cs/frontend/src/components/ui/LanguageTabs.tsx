import { useTranslation } from 'react-i18next';
import { SitePageLang } from '@dissco-cs/shared-types';
import { LANGUAGES } from '../../utility/site-lang-text';
import { Tabs } from './Tabs';

// The names of site languages in the visitor's language, joined for a message such as "the title
// is missing in: English, French".
export function useLanguageNames() {
  const { t } = useTranslation('dissco-cs');
  return (langs: SitePageLang[]) => langs.map(lang => t(`lang_${lang}`)).join(', ');
}

// The language tabs above a multilingual form (one per site language). `isMissing` marks a
// language that still needs content with a small dot.
export function LanguageTabs({ selected, onSelect, isMissing }: {
  selected: SitePageLang;
  onSelect: (lang: SitePageLang) => void;
  isMissing?: (lang: SitePageLang) => boolean;
}) {
  const { t } = useTranslation('dissco-cs');

  return (
    <Tabs
      label={t('common_tabs_language')}
      selected={selected}
      onSelect={onSelect}
      tabs={LANGUAGES.map(({ code }) => ({
        key: code,
        label: (
          <>
            {t(`lang_${code}`)}
            {isMissing?.(code) && (
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-danger-500" title={t('common_lang_missing')} />
            )}
          </>
        ),
      }))}
    />
  );
}
