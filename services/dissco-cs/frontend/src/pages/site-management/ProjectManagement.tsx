import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, queryCache } from 'react-query';
import { HrefLink } from '../../utility/href-link';
import { CsPage } from '../../components/CsPage';
import { SaveButton } from '../../components/SaveButton';
import { DeleteIconButton } from '../../components/DeleteIconButton';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { MarkdownToolbar } from '../../components/MarkdownToolbar';
import { ArrowLeftIcon } from '../../icons/ArrowLeftIcon';
import { CheckIcon } from '../../icons/CheckIcon';
import { disscoCSConfig } from '../../dissco-cs-config';
import { projectManualsApi, ProjectManualSummary, SitePageLang } from '../../api/cs-api';
import { useProjectList } from '../../hooks/use-project-list';

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
  // Zodra er ergens tekst staat, moeten alle talen tekst hebben (bestaand gedrag). Staat er
  // nergens tekst, dan volstaat één bijlage (in eender welke taal) om te mogen opslaan --
  // anders kan een PDF-only handleiding (zonder tekst) nooit bewaard worden.
  const hasAnyText = LANGUAGES.some(lang => (draftContent[lang.code] ?? '').trim());
  const hasAnyAttachment = LANGUAGES.some(lang => manual.attachments[lang.code]);
  const missingLangs = hasAnyText ? LANGUAGES.filter(lang => !(draftContent[lang.code] ?? '').trim()) : [];
  const canSave = hasAnyText ? missingLangs.length === 0 : hasAnyAttachment;

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
    try {
      await projectManualsApi.uploadAttachment(manual.id, selectedLang, file);
      await refetch();
      queryCache.invalidateQueries('project-manual');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async () => {
    await projectManualsApi.deleteAttachment(manual.id, selectedLang);
    await refetch();
    queryCache.invalidateQueries('project-manual');
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
            onClick={() => setSelectedLang(lang.code)}
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
      {!hasAnyText && !hasAnyAttachment && (
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
}> = ({ projects, manuals, refetchManuals }) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [choice, setChoice] = useState<'link' | 'create'>('link');
  const [pickedManualId, setPickedManualId] = useState<number | ''>('');
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    if (!selectedSlug && projects[0]) {
      setSelectedSlug(projects[0].slug);
    }
  }, [projects, selectedSlug]);

  const selectedProject = projects.find(p => p.slug === selectedSlug) ?? null;
  const linkedManual = selectedProject
    ? manuals.find(m => m.linkedProjectSlugs.includes(selectedProject.slug))
    : undefined;

  const linkExisting = async () => {
    if (!selectedProject || pickedManualId === '') return;
    await projectManualsApi.setLink(selectedProject.slug, Number(pickedManualId));
    setPickedManualId('');
    refetchManuals();
  };

  const createAndLink = async () => {
    if (!selectedProject || !newTitle.trim()) return;
    const manual = await projectManualsApi.create(defaultLang(i18n.language), newTitle.trim());
    await projectManualsApi.setLink(selectedProject.slug, manual.id);
    setNewTitle('');
    refetchManuals();
  };

  const unlink = async () => {
    if (!selectedProject) return;
    await projectManualsApi.setLink(selectedProject.slug, null);
    refetchManuals();
  };

  const otherProjectLabels =
    linkedManual && selectedProject && linkedManual.linkedProjectSlugs.length > 1
      ? linkedManual.linkedProjectSlugs
          .filter(slug => slug !== selectedProject.slug)
          .map(slug => {
            const project = projects.find(p => p.slug === slug);
            return project ? getLabelText(project.label, slug) : slug;
          })
      : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-5 items-start">
      <ul className="list-none m-0 p-0 bg-white rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] divide-y divide-gray-100">
        {projects.map(project => {
          const linked = manuals.find(m => m.linkedProjectSlugs.includes(project.slug));
          return (
            <li key={project.slug}>
              <button
                onClick={() => setSelectedSlug(project.slug)}
                className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left border-none bg-transparent cursor-pointer ${
                  selectedSlug === project.slug ? 'bg-gray-50 font-semibold' : ''
                }`}
              >
                <span className="truncate min-w-0">{getLabelText(project.label, project.slug)}</span>
                {linked ? (
                  <span
                    className={`text-[0.62rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ${
                      linked.linkedProjectSlugs.length > 1
                        ? 'bg-[#f1e9f0] text-[var(--cs-tertiary)]'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {linked.linkedProjectSlugs.length > 1
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

      {selectedProject && (
        <div className="bg-white rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] p-6">
          <h3 className="text-xl font-semibold text-[var(--cs-primary)] mb-1">
            {getLabelText(selectedProject.label, selectedProject.slug)}
          </h3>

          {!linkedManual ? (
            <>
              <p className="text-sm text-gray-500 mb-4">{t('sm_manuals_choose_intro')}</p>
              <div className="flex gap-3 mb-5">
                <button
                  onClick={() => setChoice('link')}
                  className={`flex-1 text-left border rounded-lg p-3.5 cursor-pointer bg-white ${
                    choice === 'link' ? 'border-[var(--cs-primary)] bg-[#f4f9f9]' : 'border-gray-300'
                  }`}
                >
                  <span className="block font-semibold text-sm mb-0.5">{t('sm_manuals_choice_link_title')}</span>
                  <span className="text-xs text-gray-500">{t('sm_manuals_choice_link_desc')}</span>
                </button>
                <button
                  onClick={() => setChoice('create')}
                  className={`flex-1 text-left border rounded-lg p-3.5 cursor-pointer bg-white ${
                    choice === 'create' ? 'border-[var(--cs-primary)] bg-[#f4f9f9]' : 'border-gray-300'
                  }`}
                >
                  <span className="block font-semibold text-sm mb-0.5">{t('sm_manuals_choice_create_title')}</span>
                  <span className="text-xs text-gray-500">{t('sm_manuals_choice_create_desc')}</span>
                </button>
              </div>

              {choice === 'link' ? (
                manuals.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('sm_manuals_none_available')}</p>
                ) : (
                  <div className="flex items-center gap-3">
                    <select
                      value={pickedManualId}
                      onChange={e => setPickedManualId(e.target.value ? Number(e.target.value) : '')}
                      className="border border-gray-300 rounded-lg p-2 flex-1"
                    >
                      <option value="">{t('sm_manuals_pick_placeholder')}</option>
                      {manuals.map(manual => (
                        <option key={manual.id} value={manual.id}>
                          {manualTitleText(manual.title, i18n.language, `#${manual.id}`)}
                          {manual.linkedProjectSlugs.length > 0
                            ? ` — ${t('sm_manuals_used_by_count', { count: manual.linkedProjectSlugs.length })}`
                            : ''}
                        </option>
                      ))}
                    </select>
                    <SaveButton onClick={() => void linkExisting()} disabled={pickedManualId === ''} />
                  </div>
                )
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder={t('sm_manuals_new_title_placeholder')}
                    className="border border-gray-300 rounded-lg p-2 flex-1"
                  />
                  <SaveButton onClick={() => void createAndLink()} disabled={!newTitle.trim()} />
                </div>
              )}
            </>
          ) : (
            <>
              {otherProjectLabels.length > 0 && (
                <div className="flex gap-2.5 items-start bg-[#f6f0f5] border border-[#e7d7e5] text-[var(--cs-tertiary)] rounded-lg px-3.5 py-3 text-sm mb-4 leading-relaxed">
                  <span>
                    <b>
                      {t('sm_manuals_shared_warning_title', {
                        title: manualTitleText(linkedManual.title, i18n.language, ''),
                      })}
                    </b>{' '}
                    {t('sm_manuals_shared_warning_body', { projects: otherProjectLabels.join(', ') })}
                  </span>
                </div>
              )}

              <ManualContentEditor manualId={linkedManual.id} />

              <button
                onClick={() => void unlink()}
                className="mt-4 text-sm font-semibold text-gray-500 bg-transparent border-none cursor-pointer hover:text-[var(--cs-primary)] p-0"
              >
                {t('sm_manuals_unlink')}
              </button>
            </>
          )}
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
      <div className="bg-white rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] overflow-hidden">
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

export const ProjectManagement: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const [tab, setTab] = useState<'projects' | 'manuals'>('projects');

  const { data: projectsResponse } = useProjectList();
  const projects = (projectsResponse?.projects ?? []).filter((p: any) => p.status === 1);

  const { data: manualsResponse, refetch: refetchManuals } = useQuery('admin-project-manuals', () => projectManualsApi.list());
  const manuals = manualsResponse?.manuals ?? [];

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container">
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
          </div>

          {tab === 'projects' ? (
            <ProjectsSubview projects={projects} manuals={manuals} refetchManuals={refetchManuals} />
          ) : (
            <ManualsSubview projects={projects} manuals={manuals} refetchManuals={refetchManuals} />
          )}
        </div>
      </div>
    </CsPage>
  );
};
