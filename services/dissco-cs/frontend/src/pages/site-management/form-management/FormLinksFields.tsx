import React from 'react';
import { useTranslation } from 'react-i18next';
import { FormProjectDto, InstitutionDto, ManualSummaryDto } from '@dissco-cs/shared-types';
import { Select } from '../../../components/ui/Select';
import { FormField } from '../../../components/ui/FormField';
import { inputClass } from '../../../components/ui/input-styles';
import { siteLangText } from '../../../utility/site-lang-text';
import { localeText } from '../../../utility/locale-text';
import { manualHasContent } from '../../../components/manuals/manual-content';
import { FormDraft } from './use-form-editor';

const toId = (value: string) => (value ? Number(value) : null);

// The template project, institution and manual of one form name. Each may stay empty: a form can
// have a manual before its institution is known, or the other way round. The template can only be
// one of the form's own projects, so a project duplicated from it gets this same form.
export function FormLinksFields({ draft, setDraft, projects, institutions, manuals }: {
  draft: FormDraft;
  setDraft: React.Dispatch<React.SetStateAction<FormDraft>>;
  projects: FormProjectDto[];
  institutions: InstitutionDto[];
  manuals: ManualSummaryDto[];
}) {
  const { t, i18n } = useTranslation('dissco-cs');

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <FormField label={t('sm_forms_template_label')}>
        <Select
          value={draft.templateProjectId ?? ''}
          onChange={e => setDraft({ ...draft, templateProjectId: toId(e.target.value) })}
          className={`${inputClass} w-full`}
        >
          <option value="">{t('sm_manuals_chip_none')}</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {localeText(project.label, i18n.language) || project.slug}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={t('sm_project_institution_label')}>
        <Select
          value={draft.institutionId ?? ''}
          onChange={e => setDraft({ ...draft, institutionId: toId(e.target.value) })}
          className={`${inputClass} w-full`}
        >
          <option value="">{t('sm_project_filter_institution_none')}</option>
          {institutions.map(inst => (
            <option key={inst.id} value={inst.id}>
              {siteLangText(inst.name, i18n.language, `#${inst.id}`)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={t('sm_project_manual_label')}>
        <Select
          value={draft.manualId ?? ''}
          onChange={e => setDraft({ ...draft, manualId: toId(e.target.value) })}
          className={`${inputClass} w-full`}
        >
          <option value="">{t('sm_project_filter_manual_none')}</option>
          {manuals.map(manual => {
            const hasContent = manualHasContent(manual);
            return (
              <option key={manual.id} value={manual.id} disabled={!hasContent}>
                {siteLangText(manual.title, i18n.language, `#${manual.id}`)}
                {!hasContent
                  ? ` — ${t('sm_manuals_empty_note')}`
                  : manual.linkedProjectSlugs.length > 0
                    ? ` — ${t('sm_manuals_used_by_count', { count: manual.linkedProjectSlugs.length })}`
                    : ''}
              </option>
            );
          })}
        </Select>
        <span className="text-xs text-gray-500">{t('sm_project_manual_edit_hint')}</span>
      </FormField>
    </div>
  );
}
