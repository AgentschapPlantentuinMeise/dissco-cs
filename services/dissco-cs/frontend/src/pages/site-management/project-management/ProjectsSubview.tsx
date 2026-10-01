import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { institutionsApi, manualsApi } from '../../../api/cs-api';
import { SaveButton } from '../../../components/SaveButton';
import { Select } from '../../../components/Select';
import { manualHasContent } from './manual-content';
import { localeText } from '../../../utility/locale-text';
import { siteLangText } from '../../../utility/site-lang-text';
import { MadocProjectListItem, InstitutionDto, ManualSummaryDto } from '@dissco-cs/shared-types';

export const ProjectsSubview: React.FC<{
  projects: MadocProjectListItem[];
  manuals: ManualSummaryDto[];
  refetchManuals: () => void;
  institutions: InstitutionDto[];
  institutionLinks: Record<string, number>;
  refetchInstitutionLinks: () => void;
}> = ({ projects, manuals, refetchManuals, institutions, institutionLinks, refetchInstitutionLinks }) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const projectLabel = (project: MadocProjectListItem) => localeText(project.label, i18n.language) || project.slug;
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterInstitutionId, setFilterInstitutionId] = useState<'all' | 'none' | string>('all');
  const [filterManualId, setFilterManualId] = useState<'all' | 'none' | string>('all');
  const [pickedInstitutionId, setPickedInstitutionId] = useState<number | ''>('');
  const [pickedManualId, setPickedManualId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = projectLabel(project)
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());
    if (!matchesSearch) return false;

    const institutionId = institutionLinks[project.slug];
    if (filterInstitutionId === 'none' && institutionId !== undefined) return false;
    if (filterInstitutionId !== 'all' && filterInstitutionId !== 'none' && String(institutionId) !== filterInstitutionId) return false;

    const linkedManual = manuals.find(m => m.linkedProjectSlugs.includes(project.slug));
    if (filterManualId === 'none' && linkedManual) return false;
    if (filterManualId !== 'all' && filterManualId !== 'none' && String(linkedManual?.id) !== filterManualId) return false;

    return true;
  });

  const editingProject = editingSlug ? projects.find(p => p.slug === editingSlug) ?? null : null;
  const linkedManual = editingProject
    ? manuals.find(m => m.linkedProjectSlugs.includes(editingProject.slug))
    : undefined;

  // Re-initializes the fields when the edited row changes or after a successful save (which
  // refreshes institutionLinks/manuals) -- on a failed save, saveError stays put because
  // nothing gets refreshed then.
  useEffect(() => {
    if (!editingProject) return;
    setPickedInstitutionId(institutionLinks[editingProject.slug] ?? '');
    setPickedManualId(linkedManual ? linkedManual.id : '');
    setSaveError(false);
    // Only editingProject.slug and linkedManual.id are read here, not the objects themselves --
    // listing the full objects would re-run this on every projects/manuals refetch that returns a
    // new array reference, even when the actual selection hasn't changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingProject?.slug, institutionLinks, linkedManual?.id]);

  const canSave = pickedInstitutionId !== '' && pickedManualId !== '';

  const save = async () => {
    if (!editingProject || !canSave) return;
    setSaving(true);
    setSaveError(false);
    try {
      await institutionsApi.setProjectLink(editingProject.slug, Number(pickedInstitutionId));
      await manualsApi.setLink(editingProject.slug, Number(pickedManualId));

      refetchInstitutionLinks();
      refetchManuals();
      setEditingSlug(null);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">{t('sm_project_links_intro')}</p>

      <div className="bg-white border-t border-gray-200">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[0.7rem] uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3 font-bold align-top">
                <div className="mb-1.5">{t('sm_projects_table_project')}</div>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('sm_projects_search_placeholder')}
                  className="w-full border border-gray-300 rounded-lg p-1.5 normal-case tracking-normal font-normal text-gray-700"
                />
              </th>
              <th className="px-4 py-3 font-bold align-top">
                <div className="mb-1.5">{t('sm_project_institution_label')}</div>
                <Select
                  value={filterInstitutionId}
                  onChange={e => setFilterInstitutionId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-1.5 normal-case tracking-normal font-normal"
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
                  className="w-full border border-gray-300 rounded-lg p-1.5 normal-case tracking-normal font-normal"
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
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map(project => {
              const linked = manuals.find(m => m.linkedProjectSlugs.includes(project.slug));
              const institution = institutions.find(inst => inst.id === institutionLinks[project.slug]);
              const isEditing = editingSlug === project.slug;
              return (
                <tr key={project.slug} className={isEditing ? 'bg-gray-50' : undefined}>
                  <td className="px-4 py-3 border-t border-gray-100 align-top">
                    <b>{projectLabel(project)}</b>
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500 align-top">
                    {isEditing ? (
                      <Select
                        value={pickedInstitutionId}
                        onChange={e => setPickedInstitutionId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full border border-gray-300 rounded-lg p-2"
                      >
                        {pickedInstitutionId === '' && (
                          <option value="" disabled>
                            {t('sm_project_institution_placeholder')}
                          </option>
                        )}
                        {institutions.map(inst => (
                          <option key={inst.id} value={inst.id}>
                            {siteLangText(inst.name, i18n.language, `#${inst.id}`)}
                          </option>
                        ))}
                      </Select>
                    ) : institution ? (
                      siteLangText(institution.name, i18n.language, `#${institution.id}`)
                    ) : (
                      t('sm_manuals_chip_none')
                    )}
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500 align-top">
                    {isEditing ? (
                      manuals.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('sm_manuals_none_available')}</p>
                      ) : (
                        <>
                          <Select
                            value={pickedManualId}
                            onChange={e => setPickedManualId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full border border-gray-300 rounded-lg p-2"
                          >
                            {pickedManualId === '' && (
                              <option value="" disabled>
                                {t('sm_manuals_pick_placeholder')}
                              </option>
                            )}
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
                          <p className="text-xs text-gray-500 mt-2">{t('sm_project_manual_edit_hint')}</p>
                        </>
                      )
                    ) : linked ? (
                      siteLangText(linked.title, i18n.language, `#${linked.id}`)
                    ) : (
                      t('sm_manuals_chip_none')
                    )}
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100 text-right whitespace-nowrap align-top">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-3">
                        {saveError && <span className="text-sm text-red-700">{t('sm_manuals_save_error')}</span>}
                        <SaveButton onClick={() => void save()} disabled={!canSave} loading={saving} />
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingSlug(project.slug)}
                        className="text-sm font-semibold text-[var(--cs-primary)] bg-transparent border-none cursor-pointer hover:underline"
                      >
                        {t('sm_manuals_edit')}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
