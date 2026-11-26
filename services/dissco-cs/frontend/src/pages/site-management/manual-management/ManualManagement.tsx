import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { manualKeys, manualQueries } from '../../../api/queries/manuals';
import { projectKeys, projectQueries } from '../../../api/queries/projects';
import { failedToLoad, loadState } from '../../../api/query-state';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBody } from '../../../components/layout/PageBody';
import { LoadingText } from '../../../components/layout/LoadingText';
import { ManageLoadError } from '../ManageLoadError';
import { manualsApi } from '../../../api/cs-client/manuals';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { LuPencil } from 'react-icons/lu';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DiscardDialog } from '../../../components/ui/DiscardDialog';
import { DeleteIconButton } from '../../../components/ui/DeleteIconButton';
import { ListWithPanel } from '../../../components/layout/ListWithPanel';
import { useItemEditor } from '../../../hooks/use-item-editor';
import { EMPTY_MANUAL_DRAFT, ManualDraft, ManualForm } from './ManualForm';
import { manualHasContent } from '../../../components/manuals/manual-content';
import { localeText } from '../../../utility/locale-text';
import { siteLangText } from '../../../utility/site-lang-text';
import { ManualSummaryDto, SITE_PAGE_LANGS, SitePageLang, manualSaveSchema } from '@dissco-cs/shared-types';
import { rowHoverClass, savedRowClass } from '../../../components/ui/list-styles';
import { SavedNotice } from '../../../components/ui/SavedNotice';
import { useSavedFlash } from '../../../hooks/use-saved-flash';
import { EmptyText } from '../../../components/layout/EmptyText';
import { formatDay } from '../../../utility/format-date';

export function ManualManagement() {
  const { t, i18n } = useTranslation('dissco-cs');
  const manualsQuery = useQuery(manualQueries.list());
  // Every status, so a manual linked only to an unpublished project still shows that project's name.
  const projectsQuery = useQuery(projectQueries.listAll());
  const manuals = manualsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
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
    closeForm,
    discardGuard,
  } = useItemEditor<ManualSummaryDto, ManualDraft>({
    emptyDraft: EMPTY_MANUAL_DRAFT,
    toDraft: manual => ({ title: manual.title, content: manual.content, picked: {} }),
  });
  const editingManual = manuals.find(manual => manual.id === editingId);

  const projectLabel = (slug: string) => {
    const project = projects.find(p => p.slug === slug);
    return project ? localeText(project.label, i18n.language) || slug : slug;
  };

  const queryClient = useQueryClient();
  // The admin list and a linked project's public manual popup.
  const onWritten = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: manualKeys.all }),
      queryClient.invalidateQueries({ queryKey: projectKeys.manuals() }),
    ]);

  const { mutate: remove } = useMutation({
    mutationFn: (id: number) => manualsApi.delete(id),
    onSuccess: (_result, id) => {
      setPendingDeleteId(null);
      if (editingId === id) {
        closeForm();
      }
      return onWritten();
    },
    meta: { errorMessage: 'error_delete_failed' },
  });

  // One request with the text and every picked file: the server saves all of it or none, so on a
  // failure the form stays open with everything still in it.
  const { savedId, flash } = useSavedFlash<number>();
  const { mutate: saveManual, isPending: saving } = useMutation({
    mutationFn: async ({ id, draft: saved }: { id: number | null; draft: ManualDraft }) => {
      const input = manualSaveSchema.parse({
        title: saved.title,
        content: saved.content,
        removeAttachments: SITE_PAGE_LANGS.filter(lang => saved.picked[lang] === null),
      });
      const files: Partial<Record<SitePageLang, File>> = {};
      for (const lang of SITE_PAGE_LANGS) {
        const file = saved.picked[lang];
        if (file) files[lang] = file;
      }
      if (id === null) {
        return (await manualsApi.create(input, files)).id;
      }
      await manualsApi.update(id, input, files);
      return id;
    },
    onSuccess: async manualId => {
      await onWritten();
      closeForm();
      flash(manualId);
    },
  });

  // The project names are only a nicer label than the slug, so the page works without them.
  if (failedToLoad(manualsQuery)) return <ManageLoadError />;

  return (
    <>
      <PageBody>
      <PageHeader
        variant="plain"
        back={{ href: '/manage', label: t('sm_back_to_hub') }}
        title={t('sm_tile_manuals_title')}
        actions={<Button size="sm" onClick={startCreate}>{t('sm_manuals_new')}</Button>}
      />

      {loadState(manualsQuery) === 'loading' ? (
        <LoadingText />
      ) : manuals.length === 0 && !isFormOpen ? (
        <EmptyText>{t('sm_manuals_empty')}</EmptyText>
      ) : (
      <ListWithPanel
        panelKey={editingId}
        onClose={cancelForm}
        panelTitle={editingManual ? siteLangText(editingManual.title, i18n.language, `#${editingManual.id}`) : t('sm_manuals_new')}
        panel={isFormOpen ? (
          <ManualForm
            key={editingId ?? 'new'}
            manualId={editingId}
            storedLangs={editingManual?.attachmentLangs ?? []}
            draft={draft}
            setDraft={setDraft}
            selectedLang={selectedLang}
            onSelectLang={setSelectedLang}
            saving={saving}
            onSave={() => saveManual({ id: editingId, draft })}
            onCancel={cancelForm}
          />
        ) : null}
        list={
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
              <tr
                key={manual.id}
                className={`${rowHoverClass} ${
                  editingId === manual.id
                    ? 'bg-gray-50'
                    : savedId === manual.id
                      ? savedRowClass
                      : manual.linkedProjectSlugs.length === 0
                        ? 'bg-attention-50'
                        : ''
                }`}
              >
                <td className="px-4 py-3 border-t border-gray-100">
                  <b>{siteLangText(manual.title, i18n.language, `#${manual.id}`)}</b>
                  {manual.linkedProjectSlugs.length === 0 && (
                    <div className="text-xs font-semibold text-attention-700 mt-0.5">{t('sm_manuals_orphan_note')}</div>
                  )}
                  {!manualHasContent(manual) && (
                    <div className="text-xs font-semibold text-danger-700 mt-0.5">{t('sm_manuals_empty_note')}</div>
                  )}
                </td>
                <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                  {manual.linkedProjectSlugs.length > 0
                    ? manual.linkedProjectSlugs.map(projectLabel).join(', ')
                    : t('sm_manuals_orphan_linked_empty')}
                </td>
                <td className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                  {formatDay(manual.updatedAt, i18n.language)}
                </td>
                <td className="px-4 py-3 border-t border-gray-100 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-4">
                    {savedId === manual.id && <SavedNotice />}
                    <IconButton icon={LuPencil} label={t('common_edit')} onClick={() => startEdit(manual)} />
                    <DeleteIconButton onClick={() => setPendingDeleteId(manual.id)} />
                  </div>
                </td>
              </tr>
          ))}
        </tbody>
      </table>
      </div>
        }
      />
      )}

      {pendingDeleteId !== null && (
        <ConfirmDialog
          title={t('sm_manuals_delete_confirm_title')}
          message={t('sm_manuals_delete_confirm')}
          confirmLabel={t('common_delete')}
          cancelLabel={t('common_cancel')}
          onConfirm={() => remove(pendingDeleteId)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      <DiscardDialog guard={discardGuard} />
      </PageBody>
    </>
  );
}
