import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementKeys, announcementQueries } from '../../../api/queries/announcements';
import { projectQueries } from '../../../api/queries/projects';
import { CsPage } from '../../../components/layout/CsPage';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBody } from '../../../components/layout/PageBody';
import { ListWithPanel } from '../../../components/layout/ListWithPanel';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Button } from '../../../components/ui/Button';
import { DeleteIconButton } from '../../../components/ui/DeleteIconButton';
import { IconButton } from '../../../components/ui/IconButton';
import { ActiveStatusToggle } from '../../../components/ui/ActiveStatusToggle';
import { LuPencil } from 'react-icons/lu';
import { siteLangText } from '../../../utility/site-lang-text';
import { useItemEditor } from '../../../hooks/use-item-editor';
import { announcementsApi } from '../../../api/cs-client/announcements';
import { AnnouncementForm, toDateInputValue } from './AnnouncementForm';
import { MadocProjectDto, AnnouncementDto, AnnouncementInput } from '@dissco-cs/shared-types';
import { rowHoverClass, savedRowClass } from '../../../components/ui/list-styles';
import { SavedNotice } from '../../../components/ui/SavedNotice';
import { useSavedFlash } from '../../../hooks/use-saved-flash';

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

  const { mutate: upsert, isPending: saving } = useMutation({
    mutationFn: async ({ id, input }: { id: AnnouncementDto['id'] | null; input: AnnouncementInput }) => {
      if (id !== null) {
        await announcementsApi.update(id, input);
        return id;
      }
      return (await announcementsApi.create(input)).id;
    },
    onSuccess: onWritten,
  });
  const { savedId, flash } = useSavedFlash<AnnouncementDto['id']>();

  const { mutate: remove } = useMutation({
    mutationFn: (id: AnnouncementDto['id']) => announcementsApi.delete(id),
    onSuccess: () => {
      setPendingDeleteId(null);
      return onWritten();
    },
    meta: { errorMessage: 'error_delete_failed' },
  });

  const save = (input: AnnouncementInput) =>
    upsert({ id: editingId, input }, {
      onSuccess: id => {
        cancelForm();
        flash(id);
      },
    });

  const confirmDelete = () => {
    if (pendingDeleteId === null) return;
    remove(pendingDeleteId);
  };

  const toggleActive = (announcement: AnnouncementDto) => {
    upsert({ id: announcement.id, input: { ...toAnnouncementInput(announcement), isActive: !announcement.isActive } });
  };

  return (
    <CsPage>
      <PageBody>
        <PageHeader
          variant="plain"
          back={{ href: '/manage', label: t('sm_back_to_hub') }}
          title={t('sm_tile_announcements_title')}
          actions={<Button size="sm" onClick={startCreate}>{t('sm_announcements_new')}</Button>}
        />

        {isLoading && <p className="text-center py-5">{t('loading_announcements')}</p>}

        {!isLoading && announcements.length === 0 && !isFormOpen && (
          <p className="text-gray-600">{t('sm_announcements_empty')}</p>
        )}

        {!isLoading && (announcements.length > 0 || isFormOpen) && (
          <ListWithPanel
            panelKey={editingId}
            onClose={cancelForm}
            panelTitle={editingId !== null ? t('sm_announcements_edit') : t('sm_announcements_new')}
            list={
            <ul className="list-none m-0 p-0 bg-white border-t border-gray-200 divide-y divide-gray-100">
              {isFormOpen && editingId === null && (
                <li className="flex items-center gap-3 px-4 py-3 border-l-4 border-l-cs-primary bg-gray-50">
                  <div className="min-w-0">
                    <p className="font-semibold m-0 italic text-gray-500 truncate">{t('sm_announcements_draft_name')}</p>
                    <p className="text-xs text-gray-400 m-0">{t('sm_announcements_draft_hint')}</p>
                  </div>
                </li>
              )}
              {announcements.map(announcement => (
                <li
                  key={announcement.id}
                  className={`flex items-center justify-between gap-4 px-4 py-3 border-l-4 ${rowHoverClass} ${
                    editingId === announcement.id
                      ? 'bg-gray-50 border-l-cs-primary'
                      : savedId === announcement.id
                        ? savedRowClass
                        : 'border-l-transparent'
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
                    {savedId === announcement.id && <SavedNotice />}
                    <ActiveStatusToggle
                      active={announcement.isActive}
                      onChange={() => toggleActive(announcement)}
                      label={siteLangText(announcement.title, i18n.language, announcement.id)}
                    />
                    <IconButton icon={LuPencil} label={t('common_edit')} onClick={() => startEdit(announcement)} />
                    <DeleteIconButton onClick={() => setPendingDeleteId(announcement.id)} />
                  </div>
                </li>
              ))}
            </ul>
            }
            panel={isFormOpen ? (
              <AnnouncementForm
                key={editingId ?? 'new'}
                draft={draft}
                setDraft={setDraft}
                selectedLang={selectedLang}
                onSelectLang={setSelectedLang}
                projects={projects}
                saving={saving}
                onSave={save}
                onCancel={cancelForm}
              />
            ) : null}
          />
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
      </PageBody>
    </CsPage>
  );
}
