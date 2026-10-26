import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { manualKeys } from '../../../api/queries/manuals';
import { projectKeys } from '../../../api/queries/projects';
import { manualsApi } from '../../../api/cs-client/manuals';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { LuPencil } from 'react-icons/lu';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DeleteIconButton } from '../../../components/ui/DeleteIconButton';
import { ListWithPanel } from '../../../components/layout/ListWithPanel';
import { useItemEditor } from '../../../hooks/use-item-editor';
import { EMPTY_MANUAL_DRAFT, ManualDraft, ManualForm } from './ManualForm';
import { manualHasContent } from './manual-content';
import { localeText } from '../../../utility/locale-text';
import { siteLangText } from '../../../utility/site-lang-text';
import { MadocProjectDto, ManualSummaryDto, SITE_PAGE_LANGS, manualInputSchema } from '@dissco-cs/shared-types';
import { rowHoverClass, savedRowClass } from '../../../components/ui/list-styles';
import { SavedNotice } from '../../../components/ui/SavedNotice';
import { useSavedFlash } from '../../../hooks/use-saved-flash';

export function ManualsSubview({ projects, manuals }: {
  projects: MadocProjectDto[];
  manuals: ManualSummaryDto[];
}) {
  const { t, i18n } = useTranslation('dissco-cs');
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
        cancelForm();
      }
      return onWritten();
    },
    meta: { errorMessage: 'error_delete_failed' },
  });

  // Set once a new manual exists on the server. When an attachment upload fails after that, the
  // form closes, so a second Save does not create the manual twice; the list shows it as incomplete.
  const createdIdRef = useRef<number | null>(null);
  const { savedId, flash } = useSavedFlash<number>();
  const { mutate: saveManual, isPending: saving } = useMutation({
    mutationFn: async ({ id, draft: saved }: { id: number | null; draft: ManualDraft }) => {
      const input = manualInputSchema.parse({ title: saved.title, content: saved.content });
      createdIdRef.current = null;
      let manualId = id;
      if (manualId === null) {
        manualId = (await manualsApi.create(input)).id;
        createdIdRef.current = manualId;
      } else {
        await manualsApi.update(manualId, input);
      }
      for (const lang of SITE_PAGE_LANGS) {
        if (!(lang in saved.picked)) continue;
        const file = saved.picked[lang];
        await (file ? manualsApi.uploadAttachment(manualId, lang, file) : manualsApi.deleteAttachment(manualId, lang));
      }
      return manualId;
    },
    onSuccess: async manualId => {
      await onWritten();
      cancelForm();
      flash(manualId);
    },
    onError: () => {
      if (createdIdRef.current !== null) {
        cancelForm();
        onWritten();
      }
    },
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={startCreate}>{t('sm_manuals_new')}</Button>
      </div>

      {manuals.length === 0 && !isFormOpen ? (
        <p className="text-sm text-gray-500">{t('sm_manuals_none_available')}</p>
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
                        ? 'bg-orange-50'
                        : ''
                }`}
              >
                <td className="px-4 py-3 border-t border-gray-100">
                  <b>{siteLangText(manual.title, i18n.language, `#${manual.id}`)}</b>
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
                  {new Date(manual.updatedAt).toLocaleDateString(i18n.language)}
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
    </div>
  );
}
