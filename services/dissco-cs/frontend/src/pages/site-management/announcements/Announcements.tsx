import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementKeys, announcementQueries } from '../../../api/queries/announcements';
import { projectQueries } from '../../../api/queries/projects';
import { HrefLink } from '../../../utility/href-link';
import { CsPage } from '../../../components/layout/CsPage';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DeleteIconButton } from '../../../components/ui/DeleteIconButton';
import { ActiveStatusToggle } from '../../../components/ui/ActiveStatusToggle';
import { LuPencil, LuArrowLeft } from 'react-icons/lu';
import { siteLangText } from '../../../utility/site-lang-text';
import { useItemEditor } from '../../../hooks/use-item-editor';
import { announcementsApi } from '../../../api/cs-client/announcements';
import { AnnouncementForm, toDateInputValue } from './AnnouncementForm';
import { MadocProjectDto, AnnouncementDto, AnnouncementInput } from '@dissco-cs/shared-types';

function targetLabel(t: (key: string) => string, announcement: AnnouncementDto): string {
  if (announcement.targetType === 'homepage') return t('sm_announcements_target_homepage');
  if (announcement.targetType === 'projects') return t('sm_announcements_target_projects');
  return `${t('sm_announcements_target_project')}: ${announcement.targetProjectSlug}`;
}

// An existing announcement as form input (also the base for the active toggle).
function toAnnouncementInput(announcement: AnnouncementDto): AnnouncementInput {
  return {
    title: announcement.title,
    description: announcement.description,
    targetType: announcement.targetType,
    targetProjectSlug: announcement.targetProjectSlug,
    isActive: announcement.isActive,
    startDate: announcement.startDate,
    endDate: announcement.endDate,
  };
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

export function Announcements() {
  const { t, i18n } = useTranslation('dissco-cs');
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(announcementQueries.admin());
  // 'published' also includes Madoc's status 2 (complete) -- only active projects can be targeted.
  const { data: publishedProjects } = useQuery(projectQueries.listAll({ published: true }));
  const announcements = data ?? [];
  const projects = (publishedProjects ?? []).filter((p: MadocProjectDto) => p.status === 1);

  const {
    editingId,
    isFormOpen,
    draft,
    setDraft,
    selectedLang,
    setSelectedLang,
    pendingDeleteId,
    setPendingDeleteId,
    startCreate,
    startEdit,
    cancelForm,
  } = useItemEditor({ emptyDraft, toDraft: toAnnouncementInput });

  // Invalidate every announcement query, so the public banners pick up the change too.
  const onWritten = () => queryClient.invalidateQueries({ queryKey: announcementKeys.all });

  const { mutate: upsert } = useMutation({
    mutationFn: async ({ id, input }: { id: AnnouncementDto['id'] | null; input: AnnouncementInput }) => {
      if (id !== null) {
        await announcementsApi.update(id, input);
      } else {
        await announcementsApi.create(input);
      }
    },
    onSuccess: onWritten,
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: AnnouncementDto['id']) => announcementsApi.delete(id),
    onSuccess: () => {
      setPendingDeleteId(null);
      return onWritten();
    },
    meta: { errorMessage: 'error_delete_failed' },
  });

  const save = (input: AnnouncementInput) => upsert({ id: editingId, input }, { onSuccess: cancelForm });

  const confirmDelete = () => {
    if (pendingDeleteId === null) return;
    remove(pendingDeleteId);
  };

  const toggleActive = (announcement: AnnouncementDto) => {
    upsert({ id: announcement.id, input: { ...toAnnouncementInput(announcement), isActive: !announcement.isActive } });
  };

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">
          <HrefLink href="/manage" className="inline-flex items-center gap-1 text-[var(--cs-primary)] no-underline font-medium hover:underline">
            <LuArrowLeft aria-hidden="true" /> {t('sm_back_to_hub')}
          </HrefLink>

          <div className="flex items-center justify-between mt-4 mb-8">
            <h1 className="text-4xl text-[var(--cs-primary)] m-0">{t('sm_tile_announcements_title')}</h1>
            <button
              onClick={startCreate}
              className="px-4 py-2 rounded-full text-sm font-semibold border-none bg-[var(--cs-primary)] text-white cursor-pointer hover:bg-[var(--cs-dark)]"
            >
              {t('sm_announcements_new')}
            </button>
          </div>

          {isLoading && <p className="text-center py-5">{t('loading_announcements')}</p>}

          {!isLoading && announcements.length === 0 && !isFormOpen && (
            <p className="text-gray-600">{t('sm_announcements_empty')}</p>
          )}

          {!isLoading && (announcements.length > 0 || isFormOpen) && (
            <div className="flex flex-col lg:flex-row items-start gap-5 mb-8">
              <ul
                className={`list-none m-0 p-0 bg-white border-t border-gray-200 divide-y divide-gray-100 min-w-0 w-full ${
                  isFormOpen ? 'lg:flex-[1_1_45%]' : ''
                }`}
              >
                {isFormOpen && editingId === null && (
                  <li className="flex items-center gap-3 px-4 py-3 border-l-4 border-l-[var(--cs-primary)] bg-gray-50">
                    <div className="min-w-0">
                      <p className="font-semibold m-0 italic text-gray-500 truncate">{t('sm_announcements_draft_name')}</p>
                      <p className="text-xs text-gray-400 m-0">{t('sm_announcements_draft_hint')}</p>
                    </div>
                  </li>
                )}
                {announcements.map(announcement => (
                  <li
                    key={announcement.id}
                    className={`flex items-center justify-between gap-4 px-4 py-3 border-l-4 ${
                      editingId === announcement.id ? 'bg-gray-50 border-l-[var(--cs-primary)]' : 'border-l-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold m-0 truncate">{siteLangText(announcement.title, i18n.language, announcement.id)}</p>
                      <p className="text-sm text-gray-500 m-0">
                        {targetLabel(t, announcement)}
                        {(announcement.startDate || announcement.endDate) && (
                          <>
                            {' · '}
                            {announcement.startDate ? toDateInputValue(announcement.startDate) : t('sm_announcements_no_date')}
                            {' – '}
                            {announcement.endDate ? toDateInputValue(announcement.endDate) : t('sm_announcements_no_date')}
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <ActiveStatusToggle
                        active={announcement.isActive}
                        onChange={() => toggleActive(announcement)}
                        label={siteLangText(announcement.title, i18n.language, announcement.id)}
                      />
                      <button
                        onClick={() => startEdit(announcement)}
                        aria-label={t('sm_pages_edit')}
                        title={t('sm_pages_edit')}
                        className="bg-transparent border-none cursor-pointer text-gray-500 hover:text-[var(--cs-primary)] p-1"
                      >
                        <LuPencil />
                      </button>
                      <DeleteIconButton onClick={() => setPendingDeleteId(announcement.id)} />
                    </div>
                  </li>
                ))}
              </ul>

              {isFormOpen && (
                <AnnouncementForm
                  key={editingId ?? 'new'}
                  draft={draft}
                  setDraft={setDraft}
                  selectedLang={selectedLang}
                  onSelectLang={setSelectedLang}
                  isEditing={editingId !== null}
                  projects={projects}
                  onSave={save}
                  onCancel={cancelForm}
                />
              )}
            </div>
          )}

          {pendingDeleteId !== null && (
            <ConfirmDialog
              title={t('sm_announcements_confirm_delete_title')}
              message={t('sm_announcements_confirm_delete')}
              confirmLabel={t('common_delete')}
              cancelLabel={t('common_cancel')}
              onConfirm={confirmDelete}
              onCancel={() => setPendingDeleteId(null)}
            />
          )}
        </div>
      </div>
    </CsPage>
  );
}
