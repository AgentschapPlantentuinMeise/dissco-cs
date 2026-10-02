import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { manualsApi } from '../../../api/cs-api';
import { SaveButton } from '../../../components/SaveButton';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { ManualContentEditor } from './ManualContentEditor';
import { manualHasContent } from './manual-content';
import { localeText } from '../../../utility/locale-text';
import { defaultLang, siteLangText } from '../../../utility/site-lang-text';
import { MadocProjectDto, MAX_MANUAL_TITLE_LENGTH, ManualSummaryDto, setManualTitleSchema } from '@dissco-cs/shared-types';

export const ManualsSubview: React.FC<{
  projects: MadocProjectDto[];
  manuals: ManualSummaryDto[];
  refetchManuals: () => void;
}> = ({ projects, manuals, refetchManuals }) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const projectLabel = (slug: string) => {
    const project = projects.find(p => p.slug === slug);
    return project ? localeText(project.label, i18n.language) || slug : slug;
  };

  const remove = async (id: number) => {
    await manualsApi.remove(id);
    setPendingDeleteId(null);
    if (editingId === id) {
      setEditingId(null);
    }
    refetchManuals();
  };

  const canCreate = setManualTitleSchema.safeParse({ lang: defaultLang(i18n.language), title: newTitle.trim() }).success;

  const create = async () => {
    if (!canCreate) return;
    const manual = await manualsApi.create(defaultLang(i18n.language), newTitle.trim());
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
          maxLength={MAX_MANUAL_TITLE_LENGTH}
          className="border border-gray-300 rounded-lg p-2 flex-1 max-w-sm"
        />
        <SaveButton onClick={() => void create()} disabled={!canCreate} />
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
          title={t('sm_manuals_delete_confirm_title')}
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
