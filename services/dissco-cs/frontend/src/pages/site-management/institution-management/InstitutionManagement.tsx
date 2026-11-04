import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { institutionKeys, institutionQueries } from '../../../api/queries/institutions';
import { CsPage } from '../../../components/layout/CsPage';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBody } from '../../../components/layout/PageBody';
import { ManageLoadError } from '../ManageLoadError';
import { failedToLoad } from '../../../api/query-state';
import { ListWithPanel } from '../../../components/layout/ListWithPanel';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DiscardDialog } from '../../../components/ui/DiscardDialog';
import { Button } from '../../../components/ui/Button';
import { DeleteIconButton } from '../../../components/ui/DeleteIconButton';
import { IconButton } from '../../../components/ui/IconButton';
import { ActiveStatusToggle } from '../../../components/ui/ActiveStatusToggle';
import { LuPencil } from 'react-icons/lu';
import { institutionsApi } from '../../../api/cs-client/institutions';
import { InstitutionDto, InstitutionInput, SitePageLang, SITE_PAGE_LANGS } from '@dissco-cs/shared-types';
import { siteLangText } from '../../../utility/site-lang-text';
import { useItemEditor } from '../../../hooks/use-item-editor';
import { InstitutionDraft, InstitutionForm } from './InstitutionForm';
import { rowHoverClass, savedRowClass } from '../../../components/ui/list-styles';
import { SavedNotice } from '../../../components/ui/SavedNotice';
import { useSavedFlash } from '../../../hooks/use-saved-flash';

const emptyMultilingualText = Object.fromEntries(SITE_PAGE_LANGS.map(lang => [lang, ''])) as Record<SitePageLang, string>;

const emptyDraft: InstitutionDraft = {
  name: { ...emptyMultilingualText },
  description: { ...emptyMultilingualText },
  email: '',
  phone: '',
  website: '',
  isActive: true,
  logo: null,
};

function toMultilingualDraft(value: Partial<Record<SitePageLang, string>>): Record<SitePageLang, string> {
  return Object.fromEntries(SITE_PAGE_LANGS.map(lang => [lang, value[lang] ?? ''])) as Record<SitePageLang, string>;
}

// An existing institution as form input (also the base for the active toggle).
function toInstitutionInput(institution: InstitutionDto): InstitutionInput {
  return {
    name: toMultilingualDraft(institution.name),
    description: toMultilingualDraft(institution.description),
    email: institution.email ?? '',
    phone: institution.phone ?? '',
    website: institution.website ?? '',
    isActive: institution.isActive,
  };
}

function toInstitutionDraft(institution: InstitutionDto): InstitutionDraft {
  return { ...toInstitutionInput(institution), logo: null };
}

export function InstitutionManagement() {
  const { t, i18n } = useTranslation('dissco-cs');
  const queryClient = useQueryClient();
  const institutionsQuery = useQuery(institutionQueries.admin());
  const { data, isLoading } = institutionsQuery;
  const institutions = data ?? [];

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
  } = useItemEditor({ emptyDraft, toDraft: toInstitutionDraft });

  // Invalidate every institution query, so the public pages pick up the change too.
  const onWritten = () => queryClient.invalidateQueries({ queryKey: institutionKeys.all });

  const { mutate: upsert, isPending: saving } = useMutation({
    mutationFn: async ({ id, input, logo }: { id: InstitutionDto['id'] | null; input: InstitutionInput; logo: File | null }) => {
      if (id !== null) {
        await institutionsApi.update(id, input, logo);
        return id;
      }
      // The form only allows saving a new institution once a logo is picked.
      if (!logo) throw new Error('A new institution needs a logo');
      return (await institutionsApi.create(input, logo)).id;
    },
    onSuccess: onWritten,
  });
  const { savedId, flash } = useSavedFlash<InstitutionDto['id']>();

  const { mutate: remove } = useMutation({
    mutationFn: (id: InstitutionDto['id']) => institutionsApi.delete(id),
    onSuccess: () => {
      setPendingDeleteId(null);
      return onWritten();
    },
    meta: { errorMessage: 'error_delete_failed' },
  });

  const save = (input: InstitutionInput, logo: File | null) =>
    upsert({ id: editingId, input, logo }, {
      onSuccess: id => {
        closeForm();
        flash(id);
      },
    });

  const confirmDelete = () => {
    if (pendingDeleteId === null) return;
    remove(pendingDeleteId);
  };

  const toggleActive = (institution: InstitutionDto) => {
    upsert({ id: institution.id, input: { ...toInstitutionInput(institution), isActive: !institution.isActive }, logo: null });
  };

  const editingInstitution = institutions.find(institution => institution.id === editingId);

  if (failedToLoad(institutionsQuery)) {
    return <ManageLoadError />;
  }

  return (
    <CsPage>
      <PageBody>
        <PageHeader
          variant="plain"
          back={{ href: '/manage', label: t('sm_back_to_hub') }}
          title={t('sm_tile_institutions_title')}
          actions={<Button size="sm" onClick={startCreate}>{t('sm_institutions_new')}</Button>}
        />

        {isLoading && <p className="text-center py-5">{t('loading_institutions')}</p>}

        {!isLoading && institutions.length === 0 && !isFormOpen && (
          <p className="text-gray-600">{t('sm_institutions_empty')}</p>
        )}

        {!isLoading && (institutions.length > 0 || isFormOpen) && (
          <ListWithPanel
            panelKey={editingId}
            onClose={cancelForm}
            panelTitle={editingId !== null ? t('sm_institutions_edit') : t('sm_institutions_new')}
            list={
            <ul className="list-none m-0 p-0 bg-white border-t border-gray-200 divide-y divide-gray-100">
              {isFormOpen && editingId === null && (
                <li className="flex items-center gap-3 px-4 py-3 border-l-4 border-l-cs-primary bg-gray-50">
                  <div className="h-10 w-10 flex-shrink-0 border border-dashed border-gray-300 rounded" />
                  <div className="min-w-0">
                    <p className="font-semibold m-0 italic text-gray-500 truncate">{t('sm_institutions_draft_name')}</p>
                    <p className="text-xs text-gray-400 m-0">{t('sm_institutions_draft_hint')}</p>
                  </div>
                </li>
              )}
              {institutions.map(institution => (
                <li
                  key={institution.id}
                  className={`flex items-center justify-between gap-4 px-4 py-3 border-l-4 ${rowHoverClass} ${
                    editingId === institution.id
                      ? 'bg-gray-50 border-l-cs-primary'
                      : savedId === institution.id
                        ? savedRowClass
                        : 'border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-10 w-10 flex-shrink-0 bg-contain bg-center bg-no-repeat bg-gray-100 rounded"
                      style={{ backgroundImage: institution.logoUpdatedAt ? `url(${institutionsApi.logoUrl(institution)})` : undefined }}
                    />
                    <p className="font-semibold m-0 truncate">{siteLangText(institution.name, i18n.language, institution.slug)}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {savedId === institution.id && <SavedNotice />}
                    <ActiveStatusToggle
                      active={institution.isActive}
                      onChange={() => toggleActive(institution)}
                      label={siteLangText(institution.name, i18n.language, institution.slug)}
                    />
                    <IconButton icon={LuPencil} label={t('common_edit')} onClick={() => startEdit(institution)} />
                    <DeleteIconButton onClick={() => setPendingDeleteId(institution.id)} />
                  </div>
                </li>
              ))}
            </ul>
            }
            panel={isFormOpen ? (
              <InstitutionForm
                key={editingId ?? 'new'}
                draft={draft}
                setDraft={setDraft}
                currentLogoUrl={editingInstitution ? institutionsApi.logoUrl(editingInstitution) : null}
                selectedLang={selectedLang}
                onSelectLang={setSelectedLang}
                saving={saving}
                onSave={save}
                onCancel={cancelForm}
              />
            ) : null}
          />
        )}

        {pendingDeleteId !== null && (
          <ConfirmDialog
            title={t('sm_institutions_confirm_delete_title')}
            message={t('sm_institutions_confirm_delete')}
            confirmLabel={t('common_delete')}
            cancelLabel={t('common_cancel')}
            onConfirm={confirmDelete}
            onCancel={() => setPendingDeleteId(null)}
          />
        )}

        <DiscardDialog guard={discardGuard} />
      </PageBody>
    </CsPage>
  );
}
