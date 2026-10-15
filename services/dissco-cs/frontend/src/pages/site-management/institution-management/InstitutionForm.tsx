import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SaveButton } from '../../../components/ui/SaveButton';
import { CancelButton } from '../../../components/ui/CancelButton';
import { ActiveToggleField } from '../../../components/ui/ActiveToggleField';
import { LanguageTabs } from '../../../components/ui/LanguageTabs';
import { InstitutionInput, SitePageLang, institutionInputSchema } from '@dissco-cs/shared-types';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// The side form of the institutions page: one institution, created or edited. The page gives it a
// new key per item, so the picked logo name starts empty for each one.
export const InstitutionForm: React.FC<{
  draft: InstitutionInput;
  setDraft: React.Dispatch<React.SetStateAction<InstitutionInput>>;
  selectedLang: SitePageLang;
  onSelectLang: (lang: SitePageLang) => void;
  isEditing: boolean;
  onSave: (input: InstitutionInput) => void;
  onCancel: () => void;
}> = ({ draft, setDraft, selectedLang, onSelectLang, isEditing, onSave, onCancel }) => {
  const { t } = useTranslation('dissco-cs');
  // Name of a logo picked in this form session; not part of the saved institution.
  const [logoFileName, setLogoFileName] = useState<string | null>(null);

  const validation = institutionInputSchema.safeParse(draft);
  const issues = validation.success ? [] : validation.error.issues;
  const issueAt = (...path: (string | number)[]) =>
    issues.some(issue => issue.path.length === path.length && issue.path.every((seg, i) => seg === path[i]));

  const emailValid = !issueAt('email');
  const phoneValid = !issueAt('phone');
  const canSave = validation.success;

  const save = () => {
    if (validation.success) onSave(validation.data);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setDraft(prev => ({ ...prev, logo: dataUrl }));
    setLogoFileName(file.name);
  };

  return (
    <div className="w-full lg:flex-[0_0_42%] lg:min-w-[380px] bg-white border border-gray-200 rounded-[10px] p-6">
      <h2 className="text-xl font-semibold text-[var(--cs-primary)] mb-4">
        {isEditing ? t('sm_institutions_edit') : t('sm_institutions_new')}
      </h2>

      <LanguageTabs
        selected={selectedLang}
        onSelect={onSelectLang}
        isMissing={lang => issueAt('name', lang) || issueAt('description', lang)}
      />

      <label className="flex flex-col gap-1 mb-4">
        <span className="text-sm font-medium text-gray-700">{t('sm_institutions_field_name')} *</span>
        <input
          type="text"
          value={draft.name[selectedLang]}
          onChange={e => setDraft(prev => ({ ...prev, name: { ...prev.name, [selectedLang]: e.target.value } }))}
          className="border border-gray-300 rounded-lg p-2"
        />
      </label>

      <label className="flex flex-col gap-1 mb-4">
        <span className="text-sm font-medium text-gray-700">{t('sm_institutions_field_description')}*</span>
        <textarea
          value={draft.description[selectedLang]}
          onChange={e =>
            setDraft(prev => ({ ...prev, description: { ...prev.description, [selectedLang]: e.target.value } }))
          }
          className="border border-gray-300 rounded-lg p-2 min-h-[90px]"
        />
      </label>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">{t('sm_institutions_field_email')}*</span>
          <input
            type="email"
            value={draft.email}
            onChange={e => setDraft(prev => ({ ...prev, email: e.target.value }))}
            className={`border rounded-lg p-2 ${emailValid ? 'border-gray-300' : 'border-red-500'}`}
          />
          {!emailValid && <span className="text-xs text-red-600">{t('sm_institutions_invalid_email')}</span>}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">{t('sm_institutions_field_phone')}*</span>
          <input
            type="text"
            value={draft.phone}
            onChange={e => setDraft(prev => ({ ...prev, phone: e.target.value }))}
            className={`border rounded-lg p-2 ${phoneValid ? 'border-gray-300' : 'border-red-500'}`}
          />
          {!phoneValid && <span className="text-xs text-red-600">{t('sm_institutions_invalid_phone')}</span>}
        </label>
      </div>

      <label className="flex flex-col gap-1 mb-4">
        <span className="text-sm font-medium text-gray-700">{t('sm_institutions_field_website')}*</span>
        <input
          type="text"
          value={draft.website}
          onChange={e => setDraft(prev => ({ ...prev, website: e.target.value }))}
          className="border border-gray-300 rounded-lg p-2"
        />
      </label>

      <div className="grid grid-cols-2 gap-4 mb-6 items-start">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">{t('sm_institutions_field_logo')}*</span>
          <div className="flex items-center gap-3">
            {draft.logo && (
              <div
                className="h-12 w-12 flex-shrink-0 bg-contain bg-center bg-no-repeat bg-gray-100 rounded"
                style={{ backgroundImage: `url(${draft.logo})` }}
              />
            )}
            <label className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-300 bg-transparent cursor-pointer hover:bg-gray-50 inline-block">
              {t('sm_institutions_choose_file')}
              <input type="file" accept="image/*" className="hidden" onChange={e => void handleLogoChange(e)} />
            </label>
            {logoFileName && <span className="text-sm text-gray-600 truncate">{logoFileName}</span>}
          </div>
        </div>

        <ActiveToggleField
          checked={draft.isActive}
          onChange={() => setDraft(prev => ({ ...prev, isActive: !prev.isActive }))}
        />
      </div>

      <div className="flex items-center gap-3">
        <SaveButton
          onClick={save}
          disabled={!canSave}
          title={!canSave ? t('common_fill_required_fields') : undefined}
        />
        <CancelButton onClick={onCancel} />
        {!canSave && (
          <span className="text-sm text-gray-500">{t('common_fill_required_fields')}</span>
        )}
      </div>
    </div>
  );
};
