import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SaveButton } from '../../../components/ui/SaveButton';
import { CancelButton } from '../../../components/ui/CancelButton';
import { ActiveToggleField } from '../../../components/ui/ActiveToggleField';
import { Select } from '../../../components/ui/Select';
import { LanguageTabs } from '../../../components/ui/LanguageTabs';
import { MarkdownToolbar } from '../../../components/ui/MarkdownToolbar';
import { localeText } from '../../../utility/locale-text';
import { MadocProjectDto, AnnouncementInput, AnnouncementTargetType, SitePageLang, announcementInputSchema } from '@dissco-cs/shared-types';
import { inputClass } from '../../../components/ui/input-styles';

export function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// The side form of the announcements page: one announcement, created or edited.
export function AnnouncementForm({ draft, setDraft, selectedLang, onSelectLang, projects, saving, onSave, onCancel }: {
  draft: AnnouncementInput;
  setDraft: React.Dispatch<React.SetStateAction<AnnouncementInput>>;
  selectedLang: SitePageLang;
  onSelectLang: (lang: SitePageLang) => void;
  // Projects an announcement can target.
  projects: MadocProjectDto[];
  saving: boolean;
  onSave: (input: AnnouncementInput) => void;
  onCancel: () => void;
}) {
  const { t, i18n } = useTranslation('dissco-cs');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const validation = announcementInputSchema.safeParse(draft);
  const canSave = validation.success;

  const save = () => {
    if (validation.success) onSave(validation.data);
  };

  return (
    <div>

      <LanguageTabs
        selected={selectedLang}
        onSelect={onSelectLang}
        isMissing={lang => !(draft.title[lang] ?? '').trim()}
      />

      <label className="flex flex-col gap-1 mb-4">
        <span className="text-sm font-medium text-gray-700">{t('sm_announcements_field_title')} *</span>
        <input
          type="text"
          value={draft.title[selectedLang] ?? ''}
          onChange={e => setDraft(prev => ({ ...prev, title: { ...prev.title, [selectedLang]: e.target.value } }))}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 mb-4">
        <span className="text-sm font-medium text-gray-700">{t('sm_announcements_field_description')} *</span>
        <MarkdownToolbar
          textareaRef={textareaRef}
          value={draft.description[selectedLang] ?? ''}
          onChange={next => setDraft(prev => ({ ...prev, description: { ...prev.description, [selectedLang]: next } }))}
        />
        <textarea
          ref={textareaRef}
          value={draft.description[selectedLang] ?? ''}
          onChange={e =>
            setDraft(prev => ({ ...prev, description: { ...prev.description, [selectedLang]: e.target.value } }))
          }
          className={`${inputClass} rounded-t-none min-h-[90px]`}
        />
      </label>

      <div className="flex flex-col gap-2 mb-4">
        <span className="text-sm font-medium text-gray-700">{t('sm_announcements_field_target')}</span>
        {(['homepage', 'projects', 'project'] as AnnouncementTargetType[]).map(targetType => (
          <label key={targetType} className="flex items-center gap-2">
            <input
              type="radio"
              checked={draft.targetType === targetType}
              onChange={() =>
                setDraft(prev => ({
                  ...prev,
                  targetType,
                  targetProjectSlug: targetType === 'project' ? prev.targetProjectSlug : null,
                }))
              }
            />
            <span>{t(`sm_announcements_target_${targetType}`)}</span>
          </label>
        ))}

        {draft.targetType === 'project' && (
          <Select
            value={draft.targetProjectSlug ?? ''}
            onChange={e => setDraft(prev => ({ ...prev, targetProjectSlug: e.target.value || null }))}
            className={inputClass}
            wrapperClassName="ml-6"
          >
            <option value="">{t('sm_announcements_select_project')}</option>
            {projects.map(project => (
              <option key={project.id} value={project.slug}>
                {localeText(project.label, i18n.language) || project.slug}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="flex gap-4 mb-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">{t('sm_announcements_field_start')}</span>
          <input
            type="date"
            value={toDateInputValue(draft.startDate)}
            onChange={e => setDraft(prev => ({ ...prev, startDate: e.target.value || null }))}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">{t('sm_announcements_field_end')}</span>
          <input
            type="date"
            value={toDateInputValue(draft.endDate)}
            onChange={e => setDraft(prev => ({ ...prev, endDate: e.target.value || null }))}
            className={inputClass}
          />
        </label>
      </div>

      <ActiveToggleField
        checked={draft.isActive}
        onChange={() => setDraft(prev => ({ ...prev, isActive: !prev.isActive }))}
      />

      <div className="flex items-center gap-3">
        <SaveButton
          onClick={save}
          loading={saving}
          disabled={!canSave}
          title={!canSave ? t('common_fill_required_fields') : undefined}
        />
        <CancelButton onClick={onCancel} />
        {!canSave && <span className="text-sm text-gray-500">{t('common_fill_required_fields')}</span>}
      </div>
    </div>
  );
}
