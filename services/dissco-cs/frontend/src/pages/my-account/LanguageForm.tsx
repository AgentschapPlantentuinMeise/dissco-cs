import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SitePageLang } from '@dissco-cs/shared-types';
import { FormField } from '../../components/ui/FormField';
import { SaveButton } from '../../components/ui/SaveButton';
import { SavedNotice } from '../../components/ui/SavedNotice';
import { Select } from '../../components/ui/Select';
import { inputClass } from '../../components/ui/input-styles';
import { LANGUAGES } from '../../utility/site-lang-text';

export function LanguageForm({ currentLanguage, saving, saved, onSave }: {
  currentLanguage: SitePageLang | null;
  saving: boolean;
  saved: boolean;
  onSave: (language: SitePageLang | null) => void;
}) {
  const { t } = useTranslation('dissco-cs');
  const [language, setLanguage] = useState<SitePageLang | ''>(currentLanguage ?? '');
  const isChanged = language !== (currentLanguage ?? '');

  return (
    <div className="flex flex-col gap-4 max-w-md">
      <FormField label={t('my_account_language_label')}>
        <Select value={language} onChange={e => setLanguage(e.target.value as SitePageLang | '')} className={`${inputClass} w-full`}>
          <option value="">{t('my_account_language_none')}</option>
          {LANGUAGES.map(lng => (
            <option key={lng.code} value={lng.code}>{lng.label}</option>
          ))}
        </Select>
      </FormField>
      <div className="flex items-center gap-3">
        <SaveButton onClick={() => onSave(language || null)} disabled={!isChanged} loading={saving} />
        {saved && !isChanged && <SavedNotice />}
      </div>
    </div>
  );
}
