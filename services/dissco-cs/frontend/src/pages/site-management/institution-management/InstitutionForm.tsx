import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SaveButton } from '../../../components/ui/SaveButton';
import { CancelButton } from '../../../components/ui/CancelButton';
import { buttonClass } from '../../../components/ui/Button';
import { ActiveToggleField } from '../../../components/ui/ActiveToggleField';
import { LanguageTabs } from '../../../components/ui/LanguageTabs';
import {
  IMAGE_UPLOAD_MIME_TYPES,
  InstitutionInput,
  MAX_EMAIL_LENGTH,
  MAX_INSTITUTION_DESCRIPTION_LENGTH,
  MAX_INSTITUTION_NAME_LENGTH,
  MAX_INSTITUTION_PHONE_LENGTH,
  MAX_INSTITUTION_WEBSITE_LENGTH,
  SitePageLang,
  imageFileSchema,
  institutionInputSchema,
} from '@dissco-cs/shared-types';
import { inputClass } from '../../../components/ui/input-styles';
import { FieldErrorText, FormField } from '../../../components/ui/FormField';
import { SaveHint } from '../../../components/ui/SaveHint';
import { useLeftFields } from '../../../hooks/use-left-fields';

export type InstitutionDraft = InstitutionInput & {
  // A logo picked in this form, sent along on save.
  logo: File | null;
};

// The side form of the institutions page: one institution, created or edited.
export function InstitutionForm({
  draft,
  setDraft,
  currentLogoUrl,
  selectedLang,
  onSelectLang,
  saving,
  onSave,
  onCancel,
}: {
  draft: InstitutionDraft;
  setDraft: React.Dispatch<React.SetStateAction<InstitutionDraft>>;
  // The stored logo of the institution being edited; null for a new one or one without a logo.
  currentLogoUrl: string | null;
  selectedLang: SitePageLang;
  onSelectLang: (lang: SitePageLang) => void;
  saving: boolean;
  onSave: (input: InstitutionInput, logo: File | null) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('dissco-cs');
  const logoFile = draft.logo;
  const [invalidLogo, setInvalidLogo] = useState(false);

  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : null), [logoFile]);
  useEffect(() => () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);
  const shownLogo = logoPreview ?? currentLogoUrl;

  const validation = institutionInputSchema.safeParse(draft);
  const issues = validation.success ? [] : validation.error.issues;
  const issueAt = (...path: (string | number)[]) =>
    issues.some(issue => issue.path.length === path.length && issue.path.every((seg, i) => seg === path[i]));

  const { left, leave } = useLeftFields<'name' | 'description' | 'website' | 'email' | 'phone'>();
  // Name and description per language: the open tab's field; the tabs mark the other languages.
  const nameError = left.name && issueAt('name', selectedLang) ? t('form_error_required') : undefined;
  const descriptionError = left.description && issueAt('description', selectedLang) ? t('form_error_required') : undefined;
  const websiteError = left.website && issueAt('website') ? t('form_error_required') : undefined;
  const emailError = left.email && issueAt('email') ? t('form_error_email') : undefined;
  const phoneError = left.phone && issueAt('phone') ? t('sm_institutions_invalid_phone') : undefined;
  const canSave = validation.success && shownLogo !== null;

  const save = () => {
    if (validation.success) onSave(validation.data, logoFile);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = imageFileSchema.safeParse(file).success;
    setInvalidLogo(!valid);
    if (valid) setDraft(prev => ({ ...prev, logo: file }));
  };

  return (
    <div>

      <LanguageTabs
        selected={selectedLang}
        onSelect={onSelectLang}
        isMissing={lang => issueAt('name', lang) || issueAt('description', lang)}
      />

      <FormField label={`${t('sm_institutions_field_name')} *`} className="mb-4" error={nameError}>
        <input
          type="text"
          value={draft.name[selectedLang]}
          onChange={e => setDraft(prev => ({ ...prev, name: { ...prev.name, [selectedLang]: e.target.value } }))}
          onBlur={leave('name')}
          aria-invalid={!!nameError}
          maxLength={MAX_INSTITUTION_NAME_LENGTH}
          className={inputClass}
        />
      </FormField>

      <FormField label={`${t('sm_institutions_field_description')}*`} className="mb-4" error={descriptionError}>
        <textarea
          value={draft.description[selectedLang]}
          onChange={e =>
            setDraft(prev => ({ ...prev, description: { ...prev.description, [selectedLang]: e.target.value } }))
          }
          onBlur={leave('description')}
          aria-invalid={!!descriptionError}
          maxLength={MAX_INSTITUTION_DESCRIPTION_LENGTH}
          className={`${inputClass} min-h-[90px]`}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <FormField label={`${t('sm_institutions_field_email')}*`} error={emailError}>
          <input
            type="email"
            value={draft.email}
            onChange={e => setDraft(prev => ({ ...prev, email: e.target.value }))}
            onBlur={leave('email')}
            aria-invalid={!!emailError}
            maxLength={MAX_EMAIL_LENGTH}
            className={inputClass}
          />
        </FormField>

        <FormField label={`${t('sm_institutions_field_phone')}*`} error={phoneError}>
          <input
            type="text"
            value={draft.phone}
            onChange={e => setDraft(prev => ({ ...prev, phone: e.target.value }))}
            onBlur={leave('phone')}
            aria-invalid={!!phoneError}
            maxLength={MAX_INSTITUTION_PHONE_LENGTH}
            className={inputClass}
          />
        </FormField>
      </div>

      <FormField label={`${t('sm_institutions_field_website')}*`} className="mb-4" error={websiteError}>
        <input
          type="text"
          value={draft.website}
          onChange={e => setDraft(prev => ({ ...prev, website: e.target.value }))}
          onBlur={leave('website')}
          aria-invalid={!!websiteError}
          maxLength={MAX_INSTITUTION_WEBSITE_LENGTH}
          className={inputClass}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4 mb-6 items-start">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">{t('sm_institutions_field_logo')}*</span>
          <div className="flex items-center gap-3">
            {shownLogo && (
              <div
                className="h-12 w-12 flex-shrink-0 bg-contain bg-center bg-no-repeat bg-gray-100 rounded"
                style={{ backgroundImage: `url(${shownLogo})` }}
              />
            )}
            <label className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              {t('sm_institutions_choose_file')}
              <input
                type="file"
                accept={IMAGE_UPLOAD_MIME_TYPES.join(',')}
                className="hidden"
                onChange={handleLogoChange}
              />
            </label>
            {logoFile && <span className="text-sm text-gray-600 truncate">{logoFile.name}</span>}
          </div>
          {invalidLogo && <FieldErrorText>{t('common_invalid_image_file')}</FieldErrorText>}
        </div>

        <ActiveToggleField
          checked={draft.isActive}
          onChange={() => setDraft(prev => ({ ...prev, isActive: !prev.isActive }))}
        />
      </div>

      <div className="flex items-center gap-3">
        <SaveButton
          onClick={save}
          loading={saving}
          disabled={!canSave}
        />
        <CancelButton onClick={onCancel} />
        {!canSave && <SaveHint>{t('common_fill_required_fields')}</SaveHint>}
      </div>
    </div>
  );
}
