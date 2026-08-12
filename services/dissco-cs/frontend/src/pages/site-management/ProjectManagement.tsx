import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, queryCache } from 'react-query';
import { HrefLink } from '../../utility/href-link';
import { buildTaskLink } from '../../utility/build-task-link';
import { localeText } from '../../utility/locale-text';
import { CsPage } from '../../components/CsPage';
import { SaveButton } from '../../components/SaveButton';
import { DeleteIconButton } from '../../components/DeleteIconButton';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { MarkdownToolbar } from '../../components/MarkdownToolbar';
import { ArrowLeftIcon } from '../../icons/ArrowLeftIcon';
import { CheckIcon } from '../../icons/CheckIcon';
import { ChevronIcon } from '../../icons/ChevronIcon';
import { disscoCSConfig } from '../../dissco-cs-config';
import {
  projectManualsApi,
  ProjectManualSummary,
  SitePageLang,
  stuckTasksApi,
  manifestClaimApi,
  StuckManifestCounter,
  institutionsApi,
  Institution,
  projectDebugApi,
} from '../../api/cs-api';
import { useProjectList } from '../../hooks/use-project-list';
import { CrowdsourcingTask } from '../../types/crowdsourcing-task';

const LANGUAGES = disscoCSConfig.supportedLanguages;

function defaultLang(currentLanguage: string): SitePageLang {
  return (LANGUAGES.find(lang => lang.code === currentLanguage)?.code ?? LANGUAGES[0].code) as SitePageLang;
}

// Madoc project labels are InternationalString ({ lang: string[] }); manual titles are
// plain per-language strings — two different shapes, hence two separate text helpers.
function getLabelText(label: any, fallback: string): string {
  if (!label) return fallback;
  const firstLang = Object.keys(label)[0];
  return firstLang && Array.isArray(label[firstLang]) ? label[firstLang][0] || fallback : fallback;
}

function manualTitleText(title: Partial<Record<SitePageLang, string>>, lang: string, fallback: string): string {
  return title[lang as SitePageLang] || title.nl || title.en || title.fr || title.de || fallback;
}

function institutionName(institution: Institution, lang: string): string {
  return institution.name[lang as SitePageLang] || institution.name.nl || institution.name.en || institution.name.fr || institution.name.de || `#${institution.id}`;
}

function manualHasContent(manual: ProjectManualSummary): boolean {
  // Elke taal telt als ingevuld zodra ze tekst OF een bijlage heeft -- zelfde regel als in de
  // handleiding-editor (ManualContentEditor), enkel volledig ingevuld (alle talen) telt als inhoud.
  return LANGUAGES.every(lang => (manual.content[lang.code] ?? '').trim().length > 0 || manual.attachmentLangs.includes(lang.code));
}

const MAX_ATTACHMENT_BYTES = 8_000_000;

// Shared editor for a manual's content (language tabs + markdown toolbar/textarea +
// attachment). Reused by both the per-project panel and the manual-library "Bewerken" row,
// so editing behaves identically no matter where it's opened from.
const ManualContentEditor: React.FC<{ manualId: number }> = ({ manualId }) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data: manual, refetch } = useQuery(['admin-manual', manualId], () => projectManualsApi.getAdmin(manualId));
  const [selectedLang, setSelectedLang] = useState<SitePageLang>(defaultLang(i18n.language));
  const [draftContent, setDraftContent] = useState<Partial<Record<SitePageLang, string>>>({});
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [uploading, setUploading] = useState(false);
  const [attachmentSaved, setAttachmentSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (manual) {
      setDraftContent(manual.content ?? {});
      setSaveState('idle');
    }
    // Enkel bij een echte wissel van handleiding herinitialiseren -- niet op manual.updated_at,
    // want dat verandert ook na onze eigen succesvolle save (via refetch), wat anders de
    // net gezette 'saved'-status meteen weer terug naar 'idle' zou zetten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manual?.id]);

  if (!manual) {
    return <p className="text-sm text-gray-500">{t('sm_manuals_loading')}</p>;
  }

  const attachment = manual.attachments[selectedLang];
  // Elke taal telt als ingevuld zodra ze tekst OF een bijlage heeft -- gemengd (tekst in de ene
  // taal, bijlage in de andere) moet dus ook kunnen. Pas opslaan zodra geen enkele taal nog leeg is.
  const langHasContent = (lang: (typeof LANGUAGES)[number]) =>
    !!(draftContent[lang.code] ?? '').trim() || !!manual.attachments[lang.code];
  const hasAnyContent = LANGUAGES.some(langHasContent);
  const missingLangs = hasAnyContent ? LANGUAGES.filter(lang => !langHasContent(lang)) : [];
  const canSave = hasAnyContent && missingLangs.length === 0;

  const save = async () => {
    if (!canSave) return;
    setSaveState('saving');
    try {
      await Promise.all(
        LANGUAGES.map(lang => projectManualsApi.setContent(manual.id, lang.code, draftContent[lang.code] ?? ''))
      );
      await refetch();
      // De publieke handleiding-popup leest een eigen, apart gecachete query ('project-manual')
      // die anders pas na de staleTime (5 min) of een harde refresh de nieuwe inhoud zou tonen.
      queryCache.invalidateQueries('project-manual');
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const onPickFile = async (file: File) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      window.alert(t('sm_manuals_attachment_too_large'));
      return;
    }
    setUploading(true);
    setAttachmentSaved(false);
    try {
      await projectManualsApi.uploadAttachment(manual.id, selectedLang, file);
      await refetch();
      queryCache.invalidateQueries('project-manual');
      setAttachmentSaved(true);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async () => {
    await projectManualsApi.deleteAttachment(manual.id, selectedLang);
    await refetch();
    queryCache.invalidateQueries('project-manual');
    setAttachmentSaved(false);
  };

  // Voegt {{attachment}} in op de cursorpositie -- ProjectManualModal bedt de bijlage-galerij
  // daar exact in i.p.v. steeds achteraan alle secties te tonen.
  const insertAttachmentMarker = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = draftContent[selectedLang] ?? '';
    const marker = '\n\n{{attachment}}\n\n';
    const next = current.slice(0, start) + marker + current.slice(end);
    setDraftContent(prev => ({ ...prev, [selectedLang]: next }));
    setSaveState('idle');
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + marker.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => {
              setSelectedLang(lang.code);
              setAttachmentSaved(false);
            }}
            className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1.5 ${
              selectedLang === lang.code
                ? 'bg-[var(--cs-primary)] text-white border-[var(--cs-primary)]'
                : 'bg-transparent text-gray-600 border-gray-300'
            }`}
          >
            {t(`lang_${lang.code}`)}
            {missingLangs.includes(lang) && (
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  selectedLang === lang.code ? 'bg-white' : 'bg-red-500'
                }`}
                title={t('sm_manuals_lang_missing')}
              />
            )}
          </button>
        ))}
      </div>

      <MarkdownToolbar
        textareaRef={textareaRef}
        value={draftContent[selectedLang] ?? ''}
        onChange={next => {
          setDraftContent(prev => ({ ...prev, [selectedLang]: next }));
          setSaveState('idle');
        }}
      />
      <textarea
        ref={textareaRef}
        value={draftContent[selectedLang] ?? ''}
        onChange={e => {
          setDraftContent(prev => ({ ...prev, [selectedLang]: e.target.value }));
          setSaveState('idle');
        }}
        placeholder={t('sm_manuals_content_placeholder')}
        className="w-full min-h-[220px] border border-gray-300 rounded-b-lg p-3 font-mono text-sm"
      />
      <p className="text-xs text-gray-500 mt-1.5">{t('sm_manuals_heading_hint')}</p>
      <p className="text-xs text-gray-500 mt-0.5">{t('sm_manuals_attachment_marker_hint')}</p>
      {missingLangs.length > 0 && (
        <p className="text-xs text-red-600 mt-1">
          {t('sm_manuals_missing_langs', { langs: missingLangs.map(lang => t(`lang_${lang.code}`)).join(', ') })}
        </p>
      )}
      {!hasAnyContent && (
        <p className="text-xs text-red-600 mt-1">{t('sm_manuals_needs_content')}</p>
      )}

      <div className="flex items-center justify-between gap-3 mt-4 px-3.5 py-2.5 bg-gray-50 rounded-lg text-sm">
        {attachment ? (
          <>
            <span className="truncate">
              {attachment.filename} · {(attachment.size / 1_000_000).toFixed(1)} MB
            </span>
            <span className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={insertAttachmentMarker}
                className="text-xs font-semibold border border-[var(--cs-primary)] text-[var(--cs-primary)] rounded px-2.5 py-1 bg-white cursor-pointer hover:bg-gray-50"
              >
                {t('sm_manuals_attachment_insert_marker')}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold border border-[var(--cs-primary)] text-[var(--cs-primary)] rounded px-2.5 py-1 bg-white cursor-pointer hover:bg-gray-50"
              >
                {t('sm_manuals_attachment_replace')}
              </button>
              <DeleteIconButton onClick={() => void removeAttachment()} />
            </span>
          </>
        ) : (
          <>
            <span className="text-gray-500">{t('sm_manuals_attachment_none')}</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs font-semibold border border-[var(--cs-primary)] text-[var(--cs-primary)] rounded px-2.5 py-1 bg-white cursor-pointer hover:bg-gray-50 disabled:opacity-50"
            >
              {uploading ? t('sm_manuals_attachment_uploading') : t('sm_manuals_attachment_add')}
            </button>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              void onPickFile(file);
            }
            e.target.value = '';
          }}
        />
      </div>
      {attachmentSaved && (
        <p className="flex items-center gap-2 text-sm text-green-700 mt-2">
          <CheckIcon aria-hidden="true" /> {t('sm_manuals_attachment_saved')}
        </p>
      )}

      <div className="flex items-center gap-3 mt-4">
        <SaveButton onClick={() => void save()} disabled={!canSave} loading={saveState === 'saving'} />
        {saveState === 'saved' && (
          <span className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            <CheckIcon aria-hidden="true" /> {t('common_saved')}
          </span>
        )}
        {saveState === 'error' && (
          <span className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            {t('sm_manuals_save_error')}
          </span>
        )}
      </div>
    </div>
  );
};

const ProjectsSubview: React.FC<{
  projects: any[];
  manuals: ProjectManualSummary[];
  refetchManuals: () => void;
  institutions: Institution[];
  institutionLinks: Record<string, number>;
  refetchInstitutionLinks: () => void;
}> = ({ projects, manuals, refetchManuals, institutions, institutionLinks, refetchInstitutionLinks }) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pickedInstitutionId, setPickedInstitutionId] = useState<number | ''>('');
  const [pickedManualId, setPickedManualId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (!selectedSlug && projects[0]) {
      setSelectedSlug(projects[0].slug);
    }
  }, [projects, selectedSlug]);

  const filteredProjects = projects.filter(project =>
    getLabelText(project.label, project.slug).toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const selectedProject = projects.find(p => p.slug === selectedSlug) ?? null;
  const linkedManual = selectedProject
    ? manuals.find(m => m.linkedProjectSlugs.includes(selectedProject.slug))
    : undefined;

  // Herinitialiseert de velden bij elke wissel van project of na een geslaagde save (die
  // institutionLinks/manuals doet verversen) -- bij een mislukte save blijft saveError dus staan
  // omdat er dan niet ververst wordt.
  useEffect(() => {
    setPickedInstitutionId(selectedProject ? institutionLinks[selectedProject.slug] ?? '' : '');
    setPickedManualId(linkedManual ? linkedManual.id : '');
    setSaveError(false);
  }, [selectedProject?.slug, institutionLinks, linkedManual?.id]);

  const canSave = pickedInstitutionId !== '' && pickedManualId !== '';

  const save = async () => {
    if (!selectedProject || !canSave) return;
    setSaving(true);
    setSaveError(false);
    try {
      await institutionsApi.setProjectLink(selectedProject.slug, Number(pickedInstitutionId));
      await projectManualsApi.setLink(selectedProject.slug, Number(pickedManualId));

      refetchInstitutionLinks();
      refetchManuals();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-5 items-start">
      <div>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('sm_projects_search_placeholder')}
          className="w-full border border-gray-300 rounded-lg p-2 mb-3"
        />
        <ul className="list-none m-0 p-0 bg-white border-t border-gray-200 divide-y divide-gray-100">
          {filteredProjects.map(project => {
          const linked = manuals.find(m => m.linkedProjectSlugs.includes(project.slug));
          const hasInstitution = institutionLinks[project.slug] !== undefined;
          const hasBothLinks = !!linked && hasInstitution;
          return (
            <li key={project.slug}>
              <button
                onClick={() => setSelectedSlug(project.slug)}
                className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left border-none bg-transparent cursor-pointer ${
                  selectedSlug === project.slug ? 'bg-gray-50 font-semibold' : ''
                }`}
              >
                <span className="truncate min-w-0">{getLabelText(project.label, project.slug)}</span>
                {hasBothLinks ? (
                  <span
                    className={`text-[0.62rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ${
                      linked && linked.linkedProjectSlugs.length > 1
                        ? 'bg-[#f1e9f0] text-[var(--cs-tertiary)]'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {linked && linked.linkedProjectSlugs.length > 1
                      ? t('sm_manuals_chip_shared', { count: linked.linkedProjectSlugs.length })
                      : t('sm_manuals_chip_linked')}
                  </span>
                ) : (
                  <span className="text-[0.62rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 bg-gray-100 text-gray-400">
                    {t('sm_manuals_chip_none')}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      </div>

      {selectedProject && (
        <div className="bg-white border border-gray-200 rounded-[10px] p-6">
          <h3 className="text-xl font-semibold text-[var(--cs-primary)] mb-1">
            {getLabelText(selectedProject.label, selectedProject.slug)}
          </h3>
          <p className="text-sm text-gray-500 mb-4">{t('sm_project_links_intro')}</p>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('sm_project_institution_label')}</label>
            <div className="relative">
              <select
                value={pickedInstitutionId}
                onChange={e => setPickedInstitutionId(e.target.value ? Number(e.target.value) : '')}
                className="w-full appearance-none border border-gray-300 rounded-lg p-2 pr-8"
              >
                {pickedInstitutionId === '' && (
                  <option value="" disabled>
                    {t('sm_project_institution_placeholder')}
                  </option>
                )}
                {institutions.map(institution => (
                  <option key={institution.id} value={institution.id}>
                    {institutionName(institution, i18n.language)}
                  </option>
                ))}
              </select>
              <ChevronIcon
                aria-hidden="true"
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('sm_project_manual_label')}</label>
            {manuals.length === 0 ? (
              <p className="text-sm text-gray-500">{t('sm_manuals_none_available')}</p>
            ) : (
              <div className="relative">
                <select
                  value={pickedManualId}
                  onChange={e => setPickedManualId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full appearance-none border border-gray-300 rounded-lg p-2 pr-8"
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
                        {manualTitleText(manual.title, i18n.language, `#${manual.id}`)}
                        {!hasContent
                          ? ` — ${t('sm_manuals_empty_note')}`
                          : manual.linkedProjectSlugs.length > 0
                            ? ` — ${t('sm_manuals_used_by_count', { count: manual.linkedProjectSlugs.length })}`
                            : ''}
                      </option>
                    );
                  })}
                </select>
                <ChevronIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">{t('sm_project_manual_edit_hint')}</p>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <SaveButton onClick={() => void save()} disabled={!canSave} loading={saving} />
            {saveError && <span className="text-sm text-red-700">{t('sm_manuals_save_error')}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

const ManualsSubview: React.FC<{
  projects: any[];
  manuals: ProjectManualSummary[];
  refetchManuals: () => void;
}> = ({ projects, manuals, refetchManuals }) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const projectLabel = (slug: string) => {
    const project = projects.find(p => p.slug === slug);
    return project ? getLabelText(project.label, slug) : slug;
  };

  const remove = async (id: number) => {
    await projectManualsApi.remove(id);
    setPendingDeleteId(null);
    if (editingId === id) {
      setEditingId(null);
    }
    refetchManuals();
  };

  const create = async () => {
    if (!newTitle.trim()) return;
    const manual = await projectManualsApi.create(defaultLang(i18n.language), newTitle.trim());
    setNewTitle('');
    setEditingId(manual.id);
    refetchManuals();
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('sm_manuals_new_heading')}</h4>
      <div className="flex items-center gap-3 mb-4">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder={t('sm_manuals_new_title_placeholder')}
          className="border border-gray-300 rounded-lg p-2 flex-1 max-w-sm"
        />
        <SaveButton onClick={() => void create()} disabled={!newTitle.trim()} />
      </div>

      {manuals.length === 0 ? (
        <p className="text-sm text-gray-500">{t('sm_manuals_none_available')}</p>
      ) : (
      <div className="bg-white border-t border-gray-200">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-[0.7rem] uppercase tracking-wide text-gray-400">
            <th className="px-4 py-3 font-bold">{t('sm_manuals_table_title')}</th>
            <th className="px-4 py-3 font-bold">{t('sm_manuals_table_linked')}</th>
            <th className="px-4 py-3 font-bold">{t('sm_manuals_table_updated')}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {manuals.map(manual => (
            <React.Fragment key={manual.id}>
              <tr className={manual.linkedProjectSlugs.length === 0 ? 'bg-orange-50' : ''}>
                <td className="px-4 py-3 border-t border-gray-100">
                  <b>{manualTitleText(manual.title, i18n.language, `#${manual.id}`)}</b>
                  {manual.linkedProjectSlugs.length === 0 && (
                    <div className="text-xs font-semibold text-amber-700 mt-0.5">{t('sm_manuals_orphan_note')}</div>
                  )}
                  {!manualHasContent(manual) && (
                    <div className="text-xs font-semibold text-red-700 mt-0.5">{t('sm_manuals_empty_note')}</div>
                  )}
                </td>
                <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                  {manual.linkedProjectSlugs.length > 0
                    ? manual.linkedProjectSlugs.map(projectLabel).join(', ')
                    : t('sm_manuals_orphan_linked_empty')}
                </td>
                <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                  {new Date(manual.updated_at).toLocaleDateString(i18n.language)}
                </td>
                <td className="px-4 py-3 border-t border-gray-100 text-right whitespace-nowrap">
                  <button
                    onClick={() => setEditingId(editingId === manual.id ? null : manual.id)}
                    className="text-sm font-semibold text-[var(--cs-primary)] bg-transparent border-none cursor-pointer hover:underline mr-4"
                  >
                    {editingId === manual.id ? t('sm_manuals_close_edit') : t('sm_manuals_edit')}
                  </button>
                  <button
                    onClick={() => setPendingDeleteId(manual.id)}
                    className="text-sm font-semibold text-red-700 bg-transparent border-none cursor-pointer hover:underline"
                  >
                    {t('common_delete')}
                  </button>
                </td>
              </tr>
              {editingId === manual.id && (
                <tr>
                  <td colSpan={4} className="px-5 pb-5 border-t border-gray-100 bg-gray-50">
                    <ManualContentEditor manualId={manual.id} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      </div>
      )}

      {pendingDeleteId !== null && (
        <ConfirmDialog
          message={t('sm_manuals_delete_confirm')}
          confirmLabel={t('common_delete')}
          cancelLabel={t('common_cancel')}
          onConfirm={() => void remove(pendingDeleteId)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
};

function statusLabelKey(status: number): string {
  return status === 0 ? 'sm_stuck_tasks_status_not_started' : 'sm_stuck_tasks_status_in_progress';
}

// buildTaskLink() only reads id/subject/subject_parent/metadata.project.slug, all of which a
// manifest-task counter also has — the cast just papers over the unrelated fields (status,
// assignee, ...) that a full CrowdsourcingTask carries but a counter row doesn't need.
function counterTaskLink(counter: StuckManifestCounter): string {
  return buildTaskLink({ id: counter.id, subject: counter.subject, metadata: counter.metadata } as CrowdsourcingTask);
}

const StuckTasksSubview: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data, refetch, status: queryStatus } = useQuery('stuck-tasks', () => stuckTasksApi.list());
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [resyncingId, setResyncingId] = useState<string | null>(null);
  const [confirmTask, setConfirmTask] = useState<CrowdsourcingTask | null>(null);

  const tasks = (data?.tasks ?? []).slice().sort((a, b) => (a.modified_at ?? 0) - (b.modified_at ?? 0));
  const manifestCounters = (data?.manifestCounters ?? []).slice().sort((a, b) => a.modified_at - b.modified_at);

  const release = async (task: CrowdsourcingTask) => {
    setConfirmTask(null);
    setReleasingId(task.id);
    try {
      await stuckTasksApi.release(task.id);
      const projectId = task.metadata?.project?.id;
      const manifestId = task.metadata?.subject?.id;
      if (projectId && manifestId) {
        // Best-effort: madoc-ts only re-syncs the shared max-contributors counter when a NEW
        // claim is created, never on a release — same reason AnnotatePage does this after abandon.
        await manifestClaimApi.resync(projectId, manifestId).catch(err => console.error('[StuckTasks] resync failed', err));
      }
      queryCache.invalidateQueries('collection');
      await refetch();
    } finally {
      setReleasingId(null);
    }
  };

  const resyncCounter = async (counter: StuckManifestCounter) => {
    setResyncingId(counter.id);
    try {
      await stuckTasksApi.resyncManifest(counter.id);
      queryCache.invalidateQueries('collection');
      await refetch();
    } finally {
      setResyncingId(null);
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-600 mb-6">{t('sm_stuck_tasks_intro')}</p>

      {queryStatus === 'loading' && <p className="text-sm text-gray-500">{t('sm_manuals_loading')}</p>}

      {queryStatus === 'success' && tasks.length === 0 && manifestCounters.length === 0 && (
        <p className="text-sm text-gray-500">{t('sm_stuck_tasks_empty')}</p>
      )}

      {tasks.length > 0 && (
        <div className="bg-white border-t border-gray-200 mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-[0.7rem] uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_manifest')}</th>
                <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_project')}</th>
                <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_assignee')}</th>
                <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_status')}</th>
                <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_modified')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => {
                const manifestLabel = localeText(task.metadata?.subject?.label, i18n.language) || task.subject || task.id;
                const projectLabel = localeText(task.metadata?.project?.label, i18n.language) || task.metadata?.project?.slug || '—';
                const modified = task.modified_at ? new Date(task.modified_at).toLocaleString(i18n.language) : '—';
                return (
                  <tr key={task.id}>
                    <td className="px-4 py-3 border-t border-gray-100">
                      <HrefLink href={buildTaskLink(task)} className="text-[var(--cs-primary)] no-underline font-medium hover:underline">
                        {manifestLabel}
                      </HrefLink>
                    </td>
                    <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">{projectLabel}</td>
                    <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                      {task.assignee?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                      {t(statusLabelKey(task.status))}
                    </td>
                    <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">{modified}</td>
                    <td className="px-4 py-3 border-t border-gray-100 text-right whitespace-nowrap">
                      <button
                        onClick={() => setConfirmTask(task)}
                        disabled={releasingId === task.id}
                        className="text-sm font-semibold text-[var(--cs-primary)] bg-transparent border-none cursor-pointer hover:underline disabled:opacity-50"
                      >
                        {t('sm_stuck_tasks_release')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {manifestCounters.length > 0 && (
        <>
          <h2 className="text-xl text-[var(--cs-primary)] mb-2">{t('sm_stuck_tasks_counters_title')}</h2>
          <p className="text-sm text-gray-600 mb-4">{t('sm_stuck_tasks_counters_intro')}</p>
          <div className="bg-white border-t border-gray-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-[0.7rem] uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_manifest')}</th>
                  <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_project')}</th>
                  <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_count')}</th>
                  <th className="px-4 py-3 font-bold">{t('sm_stuck_tasks_col_modified')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {manifestCounters.map(counter => {
                  const manifestLabel = counter.name || counter.subject || counter.id;
                  const projectLabel = localeText(counter.metadata?.project?.label, i18n.language) || counter.metadata?.project?.slug || '—';
                  const modified = new Date(counter.modified_at).toLocaleString(i18n.language);
                  return (
                    <tr key={counter.id}>
                      <td className="px-4 py-3 border-t border-gray-100">
                        <HrefLink href={counterTaskLink(counter)} className="text-[var(--cs-primary)] no-underline font-medium hover:underline">
                          {manifestLabel}
                        </HrefLink>
                      </td>
                      <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">{projectLabel}</td>
                      <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                        {counter.validCount} / {counter.maxContributors}
                      </td>
                      <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">{modified}</td>
                      <td className="px-4 py-3 border-t border-gray-100 text-right whitespace-nowrap">
                        <button
                          onClick={() => void resyncCounter(counter)}
                          disabled={resyncingId === counter.id}
                          className="text-sm font-semibold text-[var(--cs-primary)] bg-transparent border-none cursor-pointer hover:underline disabled:opacity-50"
                        >
                          {t('sm_stuck_tasks_resync')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {confirmTask && (
        <ConfirmDialog
          message={t('sm_stuck_tasks_release_confirm', {
            date: confirmTask.modified_at ? new Date(confirmTask.modified_at).toLocaleString(i18n.language) : '—',
          })}
          confirmLabel={t('sm_stuck_tasks_release')}
          cancelLabel={t('common_cancel')}
          onConfirm={() => void release(confirmTask)}
          onCancel={() => setConfirmTask(null)}
        />
      )}
    </div>
  );
};

function taskDebugStatusLabel(status: number): string {
  switch (status) {
    case -1: return 'Rejected';
    case 0: return 'Not started';
    case 1: return 'In progress';
    case 2: return 'In review';
    case 3: return 'Done';
    case 4: return 'Changes requested';
    default: return `Unknown (${status})`;
  }
}

// DEBUG-ONLY tab, opzettelijk niet vertaald (t()) zodat dit blok later in één keer weg te
// halen is. Toont per manifest van een gekozen project welke crowdsourcing-task(s) eraan
// hangen en of ze meetellen in het getranscribeerd-percentage (status "in review" of "done")
// -- zodat dat percentage op de projectpagina visueel te controleren is.
const TaskDebugSubview: React.FC<{ projects: any[] }> = ({ projects }) => {
  const { i18n } = useTranslation('dissco-cs');
  const [selectedSlug, setSelectedSlug] = useState<string>('');

  useEffect(() => {
    if (!selectedSlug && projects[0]) {
      setSelectedSlug(projects[0].slug);
    }
  }, [projects, selectedSlug]);

  const selectedProject = projects.find(p => p.slug === selectedSlug) ?? null;

  const { data, status: queryStatus } = useQuery(
    ['project-task-debug', selectedProject?.id],
    () => projectDebugApi.getTaskStatus(selectedProject.id),
    { enabled: !!selectedProject, staleTime: 0 }
  );

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Debug view: shows every manifest of the selected project, its crowdsourcing task(s) and status, and whether it
        counts towards the "transcribed" percentage shown on the project page (only "In review" or "Done" count).
      </p>

      <div className="mb-5 max-w-sm">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project</label>
        <div className="relative">
          <select
            value={selectedSlug}
            onChange={e => setSelectedSlug(e.target.value)}
            className="w-full appearance-none border border-gray-300 rounded-lg p-2 pr-8"
          >
            {projects.map(project => (
              <option key={project.slug} value={project.slug}>
                {getLabelText(project.label, project.slug)}
              </option>
            ))}
          </select>
          <ChevronIcon aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {queryStatus === 'loading' && <p className="text-sm text-gray-500">Loading…</p>}

      {data && (
        <>
          <div className="flex gap-6 mb-5 text-sm">
            <div><span className="font-semibold">Total manifests:</span> {data.totalManifests}</div>
            <div><span className="font-semibold">Computed percentage:</span> {data.transcribedPercentage}%</div>
          </div>

          <div className="bg-white border-t border-gray-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-[0.7rem] uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3 font-bold">Manifest</th>
                  <th className="px-4 py-3 font-bold">Tasks</th>
                  <th className="px-4 py-3 font-bold">Counts towards %</th>
                </tr>
              </thead>
              <tbody>
                {data.manifests.map(manifest => (
                  <tr key={manifest.manifestId} className={manifest.countsAsTranscribed ? 'bg-green-50' : ''}>
                    <td className="px-4 py-3 border-t border-gray-100">
                      {getLabelText(manifest.label, `#${manifest.manifestId}`)}
                      <span className="text-xs text-gray-400 ml-1">#{manifest.manifestId}</span>
                    </td>
                    <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
                      {manifest.tasks.length === 0 ? (
                        <span className="text-gray-400">No tasks</span>
                      ) : (
                        <ul className="list-none m-0 p-0 space-y-1">
                          {manifest.tasks.map(task => (
                            <li key={task.id}>
                              {taskDebugStatusLabel(task.status)}
                              {task.assignee ? ` — ${task.assignee}` : ''}
                              {' · '}
                              {new Date(task.modified_at).toLocaleDateString(i18n.language)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 border-t border-gray-100 text-sm">
                      {manifest.countsAsTranscribed ? (
                        <span className="text-green-700 font-semibold">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export const ProjectManagement: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const [tab, setTab] = useState<'projects' | 'manuals' | 'stuck-tasks' | 'task-debug'>('projects');

  const { data: projectsResponse } = useProjectList();
  const projects = (projectsResponse?.projects ?? []).filter((p: any) => p.status === 1);

  const { data: manualsResponse, refetch: refetchManuals } = useQuery('admin-project-manuals', () => projectManualsApi.list());
  const manuals = manualsResponse?.manuals ?? [];

  const { data: institutionsResponse } = useQuery('admin-institutions', () => institutionsApi.listAdmin());
  const institutions = institutionsResponse?.institutions ?? [];

  const { data: institutionLinksResponse, refetch: refetchInstitutionLinks } = useQuery('admin-institution-project-links', () =>
    institutionsApi.listProjectLinks()
  );
  const institutionLinks = institutionLinksResponse?.links ?? {};

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">
          <HrefLink href="/manage" className="inline-flex items-center gap-1 text-[var(--cs-primary)] no-underline font-medium hover:underline">
            <ArrowLeftIcon aria-hidden="true" /> {t('sm_back_to_hub')}
          </HrefLink>

          <h1 className="text-3xl text-[var(--cs-primary)] mt-4 mb-2">{t('sm_tile_projects_title')}</h1>

          <div className="flex gap-5 border-b border-gray-200 mb-6">
            <button
              onClick={() => setTab('projects')}
              className={`text-sm font-semibold pb-2.5 border-b-2 bg-transparent cursor-pointer ${
                tab === 'projects' ? 'text-[var(--cs-primary)] border-[var(--cs-primary)]' : 'text-gray-500 border-transparent'
              }`}
            >
              {t('sm_manuals_tab_projects')}
            </button>
            <button
              onClick={() => setTab('manuals')}
              className={`text-sm font-semibold pb-2.5 border-b-2 bg-transparent cursor-pointer ${
                tab === 'manuals' ? 'text-[var(--cs-primary)] border-[var(--cs-primary)]' : 'text-gray-500 border-transparent'
              }`}
            >
              {t('sm_manuals_tab_manuals')}
            </button>
            <button
              onClick={() => setTab('stuck-tasks')}
              className={`text-sm font-semibold pb-2.5 border-b-2 bg-transparent cursor-pointer ${
                tab === 'stuck-tasks' ? 'text-[var(--cs-primary)] border-[var(--cs-primary)]' : 'text-gray-500 border-transparent'
              }`}
            >
              {t('sm_tile_stuck_tasks_title')}
            </button>
            <button
              onClick={() => setTab('task-debug')}
              className={`text-sm font-semibold pb-2.5 border-b-2 bg-transparent cursor-pointer ${
                tab === 'task-debug' ? 'text-[var(--cs-primary)] border-[var(--cs-primary)]' : 'text-gray-500 border-transparent'
              }`}
            >
              Task status (debug)
            </button>
          </div>

          {tab === 'projects' && (
            <ProjectsSubview
              projects={projects}
              manuals={manuals}
              refetchManuals={refetchManuals}
              institutions={institutions}
              institutionLinks={institutionLinks}
              refetchInstitutionLinks={refetchInstitutionLinks}
            />
          )}
          {tab === 'manuals' && <ManualsSubview projects={projects} manuals={manuals} refetchManuals={refetchManuals} />}
          {tab === 'stuck-tasks' && <StuckTasksSubview />}
          {tab === 'task-debug' && <TaskDebugSubview projects={projects} />}
        </div>
      </div>
    </CsPage>
  );
};
