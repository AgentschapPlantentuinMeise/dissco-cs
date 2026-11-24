import { useTranslation } from 'react-i18next';
import { LuX } from 'react-icons/lu';
import { FormDto, InstitutionDto, ManualSummaryDto, checkFormLayout, madocProjectVisibility } from '@dissco-cs/shared-types';
import { IconButton } from '../../../components/ui/IconButton';
import { DeleteIconButton } from '../../../components/ui/DeleteIconButton';
import { SaveButton } from '../../../components/ui/SaveButton';
import { CancelButton } from '../../../components/ui/CancelButton';
import { SaveHint } from '../../../components/ui/SaveHint';
import { DiscardDialog } from '../../../components/ui/DiscardDialog';
import { useLanguageNames } from '../../../components/ui/LanguageTabs';
import { panelClass } from '../../../components/ui/panel-styles';
import { missingTitleLangs } from './form-layout-editor';
import { FormEditorState } from './use-form-editor';
import { FormProjectCounts } from './FormProjectCounts';
import { FormLinksFields } from './FormLinksFields';
import { FormLayoutEditor } from './FormLayoutEditor';
import { NoFormLayout } from './NoFormLayout';

// Everything one form gives its projects, saved together: institution and manual, then the layout
// (or Madoc's own field order). Removing the layout only takes effect on save, so cancel brings it
// back.
export function FormEditor({ form, editor, forms, institutions, manuals }: {
  form: FormDto;
  editor: FormEditorState;
  forms: FormDto[];
  institutions: InstitutionDto[];
  manuals: ManualSummaryDto[];
}) {
  const { t } = useTranslation('dissco-cs');
  const languageNames = useLanguageNames();
  const { draft, setDraft, fieldsQuery } = editor;
  const layout = draft.layout;
  const fields = fieldsQuery.data?.fields;

  // The server refuses to remove a stored layout while a project that is not archived uses the
  // form; a layout that was only started in this editor can always go.
  const canRemoveLayout = form.layout === null || form.projects.every(project => madocProjectVisibility(project.status) === 'archived');
  const removesLayout = form.layout !== null && layout === null;

  const missingLangs = layout ? missingTitleLangs(layout) : [];
  const problems = layout && fields ? checkFormLayout(layout, fields) : [];
  const missingRequired = problems.flatMap(problem => (problem.kind === 'missing-required' ? [problem.label] : []));
  const saveHint =
    missingLangs.length > 0
      ? t('sm_form_layouts_missing_titles', { langs: languageNames(missingLangs) })
      : missingRequired.length > 0
        ? t('sm_form_layouts_missing_required', { labels: missingRequired.join(', ') })
        : problems.length > 0
          ? t('sm_form_layouts_invalid')
          : removesLayout
            ? t('sm_forms_layout_removed_notice')
            : null;
  const blocked = layout !== null && (!fields || problems.length > 0 || missingLangs.length > 0);

  return (
    <section className={panelClass}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-cs-primary m-0">{form.formName}</h2>
          <div className="text-sm text-gray-500 mt-1">
            <FormProjectCounts projects={form.projects} />
          </div>
        </div>
        <IconButton icon={LuX} label={t('common_close')} onClick={editor.close} className="flex-shrink-0" />
      </div>

      <div className="bg-cs-primary/5 rounded p-4 mb-6">
        <FormLinksFields draft={draft} setDraft={setDraft} projects={form.projects} institutions={institutions} manuals={manuals} />
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-cs-primary m-0">{t('sm_form_layouts_table_layout')}</h3>
        {layout !== null && canRemoveLayout && <DeleteIconButton onClick={() => setDraft(prev => ({ ...prev, layout: null }))} />}
      </div>
      {layout === null ? (
        <NoFormLayout
          copyOptions={forms.filter(other => other.formName !== form.formName && other.layout !== null)}
          onCreate={() => setDraft(prev => ({ ...prev, layout: [] }))}
          onCopy={copied => setDraft(prev => ({ ...prev, layout: copied }))}
        />
      ) : (
        <FormLayoutEditor
          items={layout}
          onChange={items => setDraft(prev => ({ ...prev, layout: items }))}
          selectedLang={editor.selectedLang}
          onSelectLang={editor.setSelectedLang}
          fieldsQuery={fieldsQuery}
        />
      )}

      <div className="flex items-center gap-3 mt-6 flex-wrap">
        <SaveButton onClick={() => editor.save.mutate(form)} disabled={blocked} loading={editor.save.isPending} />
        <CancelButton onClick={editor.close} />
        {saveHint && <SaveHint>{saveHint}</SaveHint>}
      </div>
      <DiscardDialog guard={editor.discardGuard} />
    </section>
  );
}
