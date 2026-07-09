import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { HrefLink } from '../../utility/href-link';
import { CsPage } from '../../components/CsPage';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TrashIcon } from '../../icons/TrashIcon';
import { PencilIcon } from '../../icons/PencilIcon';
import { ArrowLeftIcon } from '../../icons/ArrowLeftIcon';
import { disscoCSConfig } from '../../dissco-cs-config';
import { announcementsApi, Announcement, AnnouncementInput, AnnouncementTargetType, SitePageLang } from '../../api/cs-api';
import { useProjectList } from '../../hooks/use-project-list';

const LANGUAGES = disscoCSConfig.supportedLanguages;

function getLabelText(label: any, fallback: string): string {
  if (!label) return fallback;
  const firstLang = Object.keys(label)[0];
  return firstLang && Array.isArray(label[firstLang]) ? label[firstLang][0] || fallback : fallback;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function displayText(text: Partial<Record<SitePageLang, string>>, fallback: string): string {
  return text.nl || text.en || text.fr || text.de || fallback;
}

function targetLabel(t: (key: string) => string, announcement: Announcement): string {
  if (announcement.target_type === 'homepage') return t('sm_announcements_target_homepage');
  if (announcement.target_type === 'projects') return t('sm_announcements_target_projects');
  return `${t('sm_announcements_target_project')}: ${announcement.target_project_slug}`;
}

const emptyDraft: AnnouncementInput = {
  title: {},
  description: {},
  targetType: 'homepage',
  targetProjectSlug: null,
  isActive: true,
  startDate: null,
  endDate: null,
};

export const Announcements: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const { data, isLoading, refetch } = useQuery('admin-announcements', () => announcementsApi.listAdmin());
  const { data: projectsResponse } = useProjectList();
  const announcements = data?.announcements ?? [];
  const projects = (projectsResponse?.projects ?? []).filter((p: any) => p.status === 1);

  const [editingId, setEditingId] = useState<Announcement['id'] | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draft, setDraft] = useState<AnnouncementInput>(emptyDraft);
  const [selectedLang, setSelectedLang] = useState<SitePageLang>(LANGUAGES[0].code);
  const [pendingDeleteId, setPendingDeleteId] = useState<Announcement['id'] | null>(null);

  const refresh = () => refetch();

  const startCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setSelectedLang(LANGUAGES[0].code);
    setIsFormOpen(true);
  };

  const startEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setDraft({
      title: announcement.title,
      description: announcement.description,
      targetType: announcement.target_type,
      targetProjectSlug: announcement.target_project_slug,
      isActive: announcement.is_active,
      startDate: announcement.start_date,
      endDate: announcement.end_date,
    });
    setSelectedLang(LANGUAGES[0].code);
    setIsFormOpen(true);
  };

  const cancelForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const allTitlesFilled = LANGUAGES.every(lang => (draft.title[lang.code] ?? '').trim().length > 0);
  const allDescriptionsFilled = LANGUAGES.every(lang => (draft.description[lang.code] ?? '').trim().length > 0);
  const canSave =
    allTitlesFilled &&
    allDescriptionsFilled &&
    (draft.targetType !== 'project' || !!draft.targetProjectSlug) &&
    (!draft.startDate || !draft.endDate || draft.startDate <= draft.endDate);

  const save = async () => {
    if (!canSave) return;
    if (editingId !== null) {
      await announcementsApi.update(editingId, draft);
    } else {
      await announcementsApi.create(draft);
    }
    cancelForm();
    refresh();
  };

  const confirmDelete = async () => {
    if (pendingDeleteId === null) return;
    await announcementsApi.remove(pendingDeleteId);
    setPendingDeleteId(null);
    refresh();
  };

  const toggleActive = async (announcement: Announcement) => {
    await announcementsApi.update(announcement.id, {
      title: announcement.title,
      description: announcement.description,
      targetType: announcement.target_type,
      targetProjectSlug: announcement.target_project_slug,
      isActive: !announcement.is_active,
      startDate: announcement.start_date,
      endDate: announcement.end_date,
    });
    refresh();
  };

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container">
          <HrefLink href="/beheer" className="inline-flex items-center gap-1 text-[var(--cs-primary)] no-underline font-medium hover:underline">
            <ArrowLeftIcon aria-hidden="true" /> {t('sm_back_to_hub')}
          </HrefLink>

          <div className="flex items-center justify-between mt-4 mb-6">
            <h1 className="text-3xl text-[var(--cs-primary)] m-0">{t('sm_tile_announcements_title')}</h1>
            <button
              onClick={startCreate}
              className="px-4 py-2 rounded-full text-sm font-semibold border-none bg-[var(--cs-primary)] text-white cursor-pointer hover:bg-[var(--cs-dark)]"
            >
              {t('sm_announcements_new')}
            </button>
          </div>

          {isLoading && <p className="text-center py-5">{t('loading_projects')}</p>}

          {!isLoading && announcements.length === 0 && !isFormOpen && (
            <p className="text-gray-600">{t('sm_announcements_empty')}</p>
          )}

          {!isLoading && announcements.length > 0 && (
            <ul className="list-none m-0 p-0 mb-8 bg-white rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] divide-y divide-gray-100">
              {announcements.map(announcement => (
                <li key={announcement.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold m-0 truncate">{displayText(announcement.title, announcement.id)}</p>
                    <p className="text-sm text-gray-500 m-0">
                      {targetLabel(t, announcement)}
                      {(announcement.start_date || announcement.end_date) && (
                        <>
                          {' · '}
                          {announcement.start_date ? toDateInputValue(announcement.start_date) : t('sm_announcements_no_date')}
                          {' – '}
                          {announcement.end_date ? toDateInputValue(announcement.end_date) : t('sm_announcements_no_date')}
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-500 w-16 text-right">
                      {announcement.is_active ? t('sm_pages_active') : t('sm_pages_inactive')}
                    </span>
                    <ToggleSwitch
                      checked={announcement.is_active}
                      onChange={() => void toggleActive(announcement)}
                      label={displayText(announcement.title, announcement.id)}
                    />
                    <button
                      onClick={() => startEdit(announcement)}
                      aria-label={t('sm_pages_edit')}
                      title={t('sm_pages_edit')}
                      className="bg-transparent border-none cursor-pointer text-gray-500 hover:text-[var(--cs-primary)] p-1"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => setPendingDeleteId(announcement.id)}
                      aria-label={t('sm_announcements_delete')}
                      title={t('sm_announcements_delete')}
                      className="bg-transparent border-none cursor-pointer text-gray-600 text-base px-1 flex items-center hover:text-[var(--cs-primary)] transition-colors duration-200"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {isFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
              <div className="bg-white rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.2)] p-6 max-w-xl w-full my-8">
                <h2 className="text-xl font-semibold text-[var(--cs-primary)] mb-4">
                  {editingId !== null ? t('sm_announcements_edit') : t('sm_announcements_new')}
                </h2>

                <div className="flex gap-2 mb-4">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLang(lang.code)}
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${
                        selectedLang === lang.code
                          ? 'bg-[var(--cs-primary)] text-white border-[var(--cs-primary)]'
                          : 'bg-transparent text-gray-600 border-gray-300'
                      }`}
                    >
                      {t(`lang_${lang.code}`)}
                      {!(draft.title[lang.code] ?? '').trim() && <span className="text-red-500 ml-1">•</span>}
                    </button>
                  ))}
                </div>

                <label className="flex flex-col gap-1 mb-4">
                  <span className="text-sm font-medium text-gray-700">{t('sm_announcements_field_title')} *</span>
                  <input
                    type="text"
                    value={draft.title[selectedLang] ?? ''}
                    onChange={e => setDraft(prev => ({ ...prev, title: { ...prev.title, [selectedLang]: e.target.value } }))}
                    className="border border-gray-300 rounded-lg p-2"
                  />
                </label>

                <label className="flex flex-col gap-1 mb-4">
                  <span className="text-sm font-medium text-gray-700">{t('sm_announcements_field_description')} *</span>
                  <textarea
                    value={draft.description[selectedLang] ?? ''}
                    onChange={e =>
                      setDraft(prev => ({ ...prev, description: { ...prev.description, [selectedLang]: e.target.value } }))
                    }
                    className="border border-gray-300 rounded-lg p-2 min-h-[90px]"
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
                    <select
                      value={draft.targetProjectSlug ?? ''}
                      onChange={e => setDraft(prev => ({ ...prev, targetProjectSlug: e.target.value || null }))}
                      className="border border-gray-300 rounded-lg p-2 ml-6"
                    >
                      <option value="">{t('sm_announcements_select_project')}</option>
                      {projects.map((project: any) => (
                        <option key={project.id} value={project.slug}>
                          {getLabelText(project.label, project.slug)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex gap-4 mb-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">{t('sm_announcements_field_start')}</span>
                    <input
                      type="date"
                      value={toDateInputValue(draft.startDate)}
                      onChange={e => setDraft(prev => ({ ...prev, startDate: e.target.value || null }))}
                      className="border border-gray-300 rounded-lg p-2"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">{t('sm_announcements_field_end')}</span>
                    <input
                      type="date"
                      value={toDateInputValue(draft.endDate)}
                      onChange={e => setDraft(prev => ({ ...prev, endDate: e.target.value || null }))}
                      className="border border-gray-300 rounded-lg p-2"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-3 mb-6">
                  <ToggleSwitch
                    checked={draft.isActive}
                    onChange={() => setDraft(prev => ({ ...prev, isActive: !prev.isActive }))}
                    label={t('sm_announcements_field_active')}
                  />
                  <span className="text-sm font-medium text-gray-700">{t('sm_announcements_field_active')}</span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => void save()}
                    disabled={!canSave}
                    title={!canSave ? t('sm_pages_fill_all_langs') : undefined}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border-none ${
                      canSave
                        ? 'bg-[var(--cs-primary)] text-white cursor-pointer hover:bg-[var(--cs-dark)]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {t('sm_pages_save')}
                  </button>
                  <button
                    onClick={cancelForm}
                    className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-300 bg-transparent cursor-pointer hover:bg-gray-50"
                  >
                    {t('sm_announcements_cancel')}
                  </button>
                  {!canSave && <span className="text-sm text-gray-500">{t('sm_pages_fill_all_langs')}</span>}
                </div>
              </div>
            </div>
          )}

          {pendingDeleteId !== null && (
            <ConfirmDialog
              message={t('sm_announcements_confirm_delete')}
              confirmLabel={t('sm_announcements_delete')}
              cancelLabel={t('sm_announcements_cancel')}
              onConfirm={() => void confirmDelete()}
              onCancel={() => setPendingDeleteId(null)}
            />
          )}
        </div>
      </div>
    </CsPage>
  );
};
