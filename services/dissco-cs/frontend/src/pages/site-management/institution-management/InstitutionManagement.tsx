import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { institutionKeys, institutionQueries } from '../../../api/queries/institutions';
import { HrefLink } from '../../../utility/href-link';
import { CsPage } from '../../../components/layout/CsPage';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DeleteIconButton } from '../../../components/ui/DeleteIconButton';
import { ActiveStatusToggle } from '../../../components/ui/ActiveStatusToggle';
import { LuPencil, LuArrowLeft } from 'react-icons/lu';
import { institutionsApi } from '../../../api/cs-client/institutions';
import { InstitutionDto, InstitutionInput, SitePageLang, SITE_PAGE_LANGS } from '@dissco-cs/shared-types';
import { siteLangText } from '../../../utility/site-lang-text';
import { useItemEditor } from '../../../hooks/use-item-editor';
import { InstitutionForm } from './InstitutionForm';

const emptyMultilingualText = Object.fromEntries(SITE_PAGE_LANGS.map(lang => [lang, ''])) as Record<SitePageLang, string>;

const emptyDraft: InstitutionInput = {
  name: { ...emptyMultilingualText },
  description: { ...emptyMultilingualText },
  email: '',
  phone: '',
  website: '',
  logo: '',
  isActive: true,
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
    logo: institution.logo ?? '',
    isActive: institution.isActive,
  };
}

export const InstitutionManagement: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(institutionQueries.admin());
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
  } = useItemEditor({ emptyDraft, toDraft: toInstitutionInput });

  // Invalidate every institution query, so the public pages pick up the change too.
  const onWritten = () => queryClient.invalidateQueries({ queryKey: institutionKeys.all });

  const { mutate: upsert } = useMutation({
    mutationFn: async ({ id, input }: { id: InstitutionDto['id'] | null; input: InstitutionInput }) => {
      if (id !== null) {
        await institutionsApi.update(id, input);
      } else {
        await institutionsApi.create(input);
      }
    },
    onSuccess: onWritten,
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: InstitutionDto['id']) => institutionsApi.delete(id),
    onSuccess: () => {
      setPendingDeleteId(null);
      return onWritten();
    },
    meta: { errorMessage: 'error_delete_failed' },
  });

  const save = (input: InstitutionInput) => upsert({ id: editingId, input }, { onSuccess: cancelForm });

  const confirmDelete = () => {
    if (pendingDeleteId === null) return;
    remove(pendingDeleteId);
  };

  const toggleActive = (institution: InstitutionDto) => {
    upsert({ id: institution.id, input: { ...toInstitutionInput(institution), isActive: !institution.isActive } });
  };

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">
          <HrefLink href="/manage" className="inline-flex items-center gap-1 text-[var(--cs-primary)] no-underline font-medium hover:underline">
            <LuArrowLeft aria-hidden="true" /> {t('sm_back_to_hub')}
          </HrefLink>

          <div className="flex items-center justify-between mt-4 mb-8">
            <h1 className="text-4xl text-[var(--cs-primary)] m-0">{t('sm_tile_institutions_title')}</h1>
            <button
              onClick={startCreate}
              className="px-4 py-2 rounded-full text-sm font-semibold border-none bg-[var(--cs-primary)] text-white cursor-pointer hover:bg-[var(--cs-dark)]"
            >
              {t('sm_institutions_new')}
            </button>
          </div>

          {isLoading && <p className="text-center py-5">{t('loading_institutions')}</p>}

          {!isLoading && institutions.length === 0 && !isFormOpen && (
            <p className="text-gray-600">{t('sm_institutions_empty')}</p>
          )}

          {!isLoading && (institutions.length > 0 || isFormOpen) && (
            <div className="flex flex-col lg:flex-row items-start gap-5 mb-8">
              <ul
                className={`list-none m-0 p-0 bg-white border-t border-gray-200 divide-y divide-gray-100 min-w-0 w-full ${
                  isFormOpen ? 'lg:flex-[1_1_55%]' : ''
                }`}
              >
                {isFormOpen && editingId === null && (
                  <li className="flex items-center gap-3 px-4 py-3 border-l-4 border-l-[var(--cs-primary)] bg-gray-50">
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
                    className={`flex items-center justify-between gap-4 px-4 py-3 border-l-4 ${
                      editingId === institution.id ? 'bg-gray-50 border-l-[var(--cs-primary)]' : 'border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-10 w-10 flex-shrink-0 bg-contain bg-center bg-no-repeat bg-gray-100 rounded"
                        style={{ backgroundImage: institution.logo ? `url(${institution.logo})` : undefined }}
                      />
                      <p className="font-semibold m-0 truncate">{siteLangText(institution.name, i18n.language, institution.slug)}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <ActiveStatusToggle
                        active={institution.isActive}
                        onChange={() => toggleActive(institution)}
                        label={siteLangText(institution.name, i18n.language, institution.slug)}
                      />
                      <button
                        onClick={() => startEdit(institution)}
                        aria-label={t('sm_pages_edit')}
                        title={t('sm_pages_edit')}
                        className="bg-transparent border-none cursor-pointer text-gray-500 hover:text-[var(--cs-primary)] p-1"
                      >
                        <LuPencil />
                      </button>
                      <DeleteIconButton onClick={() => setPendingDeleteId(institution.id)} />
                    </div>
                  </li>
                ))}
              </ul>

              {isFormOpen && (
                <InstitutionForm
                  key={editingId ?? 'new'}
                  draft={draft}
                  setDraft={setDraft}
                  selectedLang={selectedLang}
                  onSelectLang={setSelectedLang}
                  isEditing={editingId !== null}
                  onSave={save}
                  onCancel={cancelForm}
                />
              )}
            </div>
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
        </div>
      </div>
    </CsPage>
  );
};
