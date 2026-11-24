import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { LuPencil } from 'react-icons/lu';
import { institutionQueries } from '../../../api/queries/institutions';
import { manualQueries } from '../../../api/queries/manuals';
import { CsPage } from '../../../components/layout/CsPage';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBody } from '../../../components/layout/PageBody';
import { ManageLoadError } from '../ManageLoadError';
import { IconButton } from '../../../components/ui/IconButton';
import { SavedNotice } from '../../../components/ui/SavedNotice';
import { rowHoverClass, savedRowClass } from '../../../components/ui/list-styles';
import { EmptyText } from '../../../components/layout/EmptyText';
import { LoadingText } from '../../../components/layout/LoadingText';
import { loadState } from '../../../api/query-state';
import { siteLangText } from '../../../utility/site-lang-text';
import { MadocProjectAdminLink } from '../../../components/projects/MadocProjectAdminLink';
import { useFormEditor } from './use-form-editor';
import { FormProjectCounts } from './FormProjectCounts';
import { FormEditor } from './FormEditor';

// Everything a project gets through its form name: one row per form, with its layout, institution
// and manual. An opened form replaces the list, because the layout editor needs the full width for
// the structure and the preview.
export function FormManagement() {
  const { t, i18n } = useTranslation('dissco-cs');
  const editor = useFormEditor();
  const institutionsQuery = useQuery(institutionQueries.admin());
  const manualsQuery = useQuery(manualQueries.list());
  const institutions = institutionsQuery.data ?? [];
  const manuals = manualsQuery.data ?? [];
  const forms = editor.formsQuery.data ?? [];

  const state = loadState(editor.formsQuery, institutionsQuery, manualsQuery);
  if (state === 'failed') return <ManageLoadError />;

  const page = (content: ReactNode) => (
    <CsPage>
      <PageBody>
        <PageHeader variant="plain" back={{ href: '/manage', label: t('sm_back_to_hub') }} title={t('sm_tile_forms_title')} />
        {content}
      </PageBody>
    </CsPage>
  );

  if (state === 'loading') return page(<LoadingText />);

  if (editor.editing) {
    return page(<FormEditor form={editor.editing} editor={editor} forms={forms} institutions={institutions} manuals={manuals} />);
  }

  const noneText = <span className="text-gray-400">{t('sm_manuals_chip_none')}</span>;

  return page(
    <div>
      <p className="text-sm text-gray-600 mt-0 mb-4">{t('sm_form_layouts_intro')}</p>
      {forms.length === 0 ? (
        <EmptyText>{t('sm_form_layouts_empty')}</EmptyText>
      ) : (
        <div className="bg-white border-t border-gray-200 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-[0.7rem] uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-bold">{t('sm_form_layouts_table_form')}</th>
                <th className="px-4 py-3 font-bold">{t('sm_form_layouts_table_projects')}</th>
                <th className="px-4 py-3 font-bold">{t('sm_forms_template_label')}</th>
                <th className="px-4 py-3 font-bold">{t('sm_form_layouts_table_layout')}</th>
                <th className="px-4 py-3 font-bold">{t('sm_project_institution_label')}</th>
                <th className="px-4 py-3 font-bold">{t('sm_project_manual_label')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {forms.map(form => {
                const institution = institutions.find(inst => inst.id === form.institutionId);
                const manual = manuals.find(m => m.id === form.manualId);
                const template = form.projects.find(project => project.id === form.templateProjectId);
                const isSaved = editor.savedFormName === form.formName;
                return (
                  <tr key={form.formName} className={`${rowHoverClass} ${isSaved ? savedRowClass : ''}`}>
                    <td className="px-4 py-3 border-t border-gray-100 font-semibold">{form.formName}</td>
                    <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                      <FormProjectCounts projects={form.projects} />
                    </td>
                    <td className="px-4 py-3 border-t border-gray-100 text-sm">
                      {/* Madoc's project page has "Duplicate this project", which picks the right
                          create route itself (tabular projects use another one). */}
                      {template ? <MadocProjectAdminLink project={template} title={t('sm_forms_template_open')} /> : noneText}
                    </td>
                    <td className="px-4 py-3 border-t border-gray-100 text-sm">
                      {form.layout ? t('sm_forms_layout_own') : <span className="text-gray-400">{t('sm_forms_layout_default')}</span>}
                    </td>
                    <td className="px-4 py-3 border-t border-gray-100 text-sm">
                      {institution ? siteLangText(institution.name, i18n.language, `#${institution.id}`) : noneText}
                    </td>
                    <td className="px-4 py-3 border-t border-gray-100 text-sm">
                      {manual ? siteLangText(manual.title, i18n.language, `#${manual.id}`) : noneText}
                    </td>
                    <td className="px-4 py-3 border-t border-gray-100 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-4">
                        {isSaved && <SavedNotice />}
                        <IconButton icon={LuPencil} label={t('common_edit')} onClick={() => editor.open(form)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
