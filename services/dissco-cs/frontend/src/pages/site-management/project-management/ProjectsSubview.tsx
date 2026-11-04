import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '../../../api/queries/projects';
import { manualKeys } from '../../../api/queries/manuals';
import { institutionKeys } from '../../../api/queries/institutions';
import { projectsApi } from '../../../api/cs-client/projects';
import { SaveButton } from '../../../components/ui/SaveButton';
import { CancelButton } from '../../../components/ui/CancelButton';
import { DiscardDialog } from '../../../components/ui/DiscardDialog';
import { useDiscardGuard } from '../../../hooks/use-discard-guard';
import { ListWithPanel } from '../../../components/layout/ListWithPanel';
import { IconButton } from '../../../components/ui/IconButton';
import { LuPencil } from 'react-icons/lu';
import { Select } from '../../../components/ui/Select';
import { manualHasContent } from './manual-content';
import { localeText } from '../../../utility/locale-text';
import { siteLangText } from '../../../utility/site-lang-text';
import { MadocProjectDto, InstitutionDto, ManualSummaryDto } from '@dissco-cs/shared-types';
import { rowHoverClass, savedRowClass } from '../../../components/ui/list-styles';
import { SavedNotice } from '../../../components/ui/SavedNotice';
import { useSavedFlash } from '../../../hooks/use-saved-flash';
import { filterFieldClass, inputClass } from '../../../components/ui/input-styles';

export function ProjectsSubview({ projects, manuals, institutions, institutionLinks }: {
  projects: MadocProjectDto[];
  manuals: ManualSummaryDto[];
  institutions: InstitutionDto[];
  institutionLinks: Record<string, number>;
}) {
  const { t, i18n } = useTranslation('dissco-cs');
  const projectLabel = (project: MadocProjectDto) => localeText(project.label, i18n.language) || project.slug;
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterInstitutionId, setFilterInstitutionId] = useState<'all' | 'none' | string>('all');
  const [filterManualId, setFilterManualId] = useState<'all' | 'none' | string>('all');
  const [pickedInstitutionId, setPickedInstitutionId] = useState<number | ''>('');
  const [pickedManualId, setPickedManualId] = useState<number | ''>('');

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
  // refreshes institutionLinks/manuals).
  useEffect(() => {
    if (!editingProject) return;
    setPickedInstitutionId(institutionLinks[editingProject.slug] ?? '');
    setPickedManualId(linkedManual ? linkedManual.id : '');
    // Only editingProject.slug and linkedManual.id are read here, not the objects themselves --
    // listing the full objects would re-run this on every projects/manuals refetch that returns a
    // new array reference, even when the actual selection hasn't changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingProject?.slug, institutionLinks, linkedManual?.id]);

  const canSave = pickedInstitutionId !== '' && pickedManualId !== '';
  const discardGuard = useDiscardGuard(
    !!editingProject &&
      (pickedInstitutionId !== (institutionLinks[editingProject.slug] ?? '') || pickedManualId !== (linkedManual?.id ?? ''))
  );

  const queryClient = useQueryClient();
  const { savedId: savedSlug, flash } = useSavedFlash<string>();
  const { mutate: saveLinks, isPending: saving } = useMutation({
    mutationFn: async ({ slug, institutionId, manualId }: { slug: string; institutionId: number; manualId: number }) => {
      await projectsApi.setInstitutionLink(slug, institutionId);
      await projectsApi.setManualLink(slug, manualId);
    },
    onSuccess: async (_result, { slug }) => {
      // The admin lists here plus the public project page (its institution and manual). The row
      // closes only once they are refreshed, otherwise it shows the old values for a moment.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.institutionLinks() }),
        queryClient.invalidateQueries({ queryKey: projectKeys.institution(slug) }),
        queryClient.invalidateQueries({ queryKey: projectKeys.manual(slug) }),
        queryClient.invalidateQueries({ queryKey: institutionKeys.all }),
        queryClient.invalidateQueries({ queryKey: manualKeys.all }),
      ]);
      setEditingSlug(null);
      flash(slug);
    },
  });

  const save = () => {
    if (!editingProject || !canSave) return;
    saveLinks({ slug: editingProject.slug, institutionId: Number(pickedInstitutionId), manualId: Number(pickedManualId) });
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">{t('sm_project_links_intro')}</p>

      <ListWithPanel
        panelKey={editingSlug}
        onClose={() => discardGuard.guard(() => setEditingSlug(null))}
        panelTitle={editingProject && projectLabel(editingProject)}
        list={
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
                  className={filterFieldClass}
                />
              </th>
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
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map(project => {
              const linked = manuals.find(m => m.linkedProjectSlugs.includes(project.slug));
              const institution = institutions.find(inst => inst.id === institutionLinks[project.slug]);
              const isEditing = editingSlug === project.slug;
              return (
                <tr
                  key={project.slug}
                  className={`${rowHoverClass} ${isEditing ? 'bg-gray-50' : savedSlug === project.slug ? savedRowClass : ''}`}
                >
                  <td className="px-4 py-3 border-t border-gray-100 align-top">
                    <b>{projectLabel(project)}</b>
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500 align-top">
                    {institution ? siteLangText(institution.name, i18n.language, `#${institution.id}`) : t('sm_manuals_chip_none')}
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500 align-top">
                    {linked ? siteLangText(linked.title, i18n.language, `#${linked.id}`) : t('sm_manuals_chip_none')}
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100 text-right whitespace-nowrap align-top">
                    <span className="inline-flex items-center gap-4">
                      {savedSlug === project.slug && <SavedNotice />}
                      <IconButton icon={LuPencil} label={t('common_edit')} onClick={() => discardGuard.guard(() => setEditingSlug(project.slug))} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
        }
        panel={editingProject ? (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">{t('sm_project_institution_label')}</span>
              <Select
                value={pickedInstitutionId}
                onChange={e => setPickedInstitutionId(e.target.value ? Number(e.target.value) : '')}
                className={`${inputClass} w-full`}
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
            </label>
            {manuals.length === 0 ? (
              <p className="text-sm text-gray-500 m-0">{t('sm_manuals_none_available')}</p>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">{t('sm_project_manual_label')}</span>
                <Select
                  value={pickedManualId}
                  onChange={e => setPickedManualId(e.target.value ? Number(e.target.value) : '')}
                  className={`${inputClass} w-full`}
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
                <span className="text-xs text-gray-500">{t('sm_project_manual_edit_hint')}</span>
              </label>
            )}
            <div className="flex items-center gap-3">
              <SaveButton onClick={save} disabled={!canSave} loading={saving} />
              <CancelButton onClick={() => discardGuard.guard(() => setEditingSlug(null))} />
            </div>
          </div>
        ) : null}
      />

      <DiscardDialog guard={discardGuard} />
    </div>
  );
}
