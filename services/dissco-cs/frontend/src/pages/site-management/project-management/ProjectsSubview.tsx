import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '../../../components/ui/Select';
import { localeText } from '../../../utility/locale-text';
import { siteLangText } from '../../../utility/site-lang-text';
import { FormDto, MadocProjectDto, InstitutionDto, ManualSummaryDto } from '@dissco-cs/shared-types';
import { rowHoverClass } from '../../../components/ui/list-styles';
import { filterFieldClass } from '../../../components/ui/input-styles';
import { MadocProjectAdminLink } from '../../../components/projects/MadocProjectAdminLink';

// Read only: a project gets its institution and manual through its form name, which is
// set on the Forms page.
export function ProjectsSubview({ projects, manuals, institutions, forms }: {
  projects: MadocProjectDto[];
  manuals: ManualSummaryDto[];
  institutions: InstitutionDto[];
  forms: FormDto[];
}) {
  const { t, i18n } = useTranslation('dissco-cs');
  const projectLabel = (project: MadocProjectDto) => localeText(project.label, i18n.language) || project.slug;
  const [searchQuery, setSearchQuery] = useState('');
  const [filterInstitutionId, setFilterInstitutionId] = useState<'all' | 'none' | string>('all');
  const [filterManualId, setFilterManualId] = useState<'all' | 'none' | string>('all');

  const formBySlug = new Map(forms.flatMap(form => form.projects.map(project => [project.slug, form] as const)));

  const filteredProjects = projects.filter(project => {
    const matchesSearch = projectLabel(project)
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());
    if (!matchesSearch) return false;

    const form = formBySlug.get(project.slug);
    const institutionId = form?.institutionId ?? null;
    if (filterInstitutionId === 'none' && institutionId !== null) return false;
    if (filterInstitutionId !== 'all' && filterInstitutionId !== 'none' && String(institutionId) !== filterInstitutionId) return false;

    const manualId = form?.manualId ?? null;
    if (filterManualId === 'none' && manualId !== null) return false;
    if (filterManualId !== 'all' && filterManualId !== 'none' && String(manualId) !== filterManualId) return false;

    return true;
  });

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">{t('sm_project_links_intro')}</p>

      <div className="bg-white border-t border-gray-200 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[0.7rem] uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3 font-bold align-top">
                <div className="mb-1.5">{t('sm_projects_table_project')}</div>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('sm_projects_search_placeholder')}
                  className={filterFieldClass}
                />
              </th>
              <th className="px-4 py-3 font-bold align-top">{t('sm_form_layouts_table_form')}</th>
              <th className="px-4 py-3 font-bold align-top">
                <div className="mb-1.5">{t('sm_project_institution_label')}</div>
                <Select
                  value={filterInstitutionId}
                  onChange={e => setFilterInstitutionId(e.target.value)}
                  className={filterFieldClass}
                >
                  <option value="all">{t('sm_project_filter_institution_all')}</option>
                  <option value="none">{t('sm_project_filter_institution_none')}</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {siteLangText(inst.name, i18n.language, `#${inst.id}`)}
                    </option>
                  ))}
                </Select>
              </th>
              <th className="px-4 py-3 font-bold align-top">
                <div className="mb-1.5">{t('sm_project_manual_label')}</div>
                <Select
                  value={filterManualId}
                  onChange={e => setFilterManualId(e.target.value)}
                  className={filterFieldClass}
                >
                  <option value="all">{t('sm_project_filter_manual_all')}</option>
                  <option value="none">{t('sm_project_filter_manual_none')}</option>
                  {manuals.map(manual => (
                    <option key={manual.id} value={manual.id}>
                      {siteLangText(manual.title, i18n.language, `#${manual.id}`)}
                    </option>
                  ))}
                </Select>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map(project => {
              const form = formBySlug.get(project.slug);
              const linked = manuals.find(m => m.id === form?.manualId);
              const institution = institutions.find(inst => inst.id === form?.institutionId);
              return (
                <tr key={project.slug} className={rowHoverClass}>
                  <td className="px-4 py-3 border-t border-gray-100 align-top">
                    <b>
                      <MadocProjectAdminLink project={project} />
                    </b>
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500 align-top">
                    {form?.formName ?? t('sm_manuals_chip_none')}
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500 align-top">
                    {institution ? siteLangText(institution.name, i18n.language, `#${institution.id}`) : t('sm_manuals_chip_none')}
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500 align-top">
                    {linked ? siteLangText(linked.title, i18n.language, `#${linked.id}`) : t('sm_manuals_chip_none')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
