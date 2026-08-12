import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { HrefLink } from '../../utility/href-link';
import { CsPage } from '../../components/CsPage';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DeleteIconButton } from '../../components/DeleteIconButton';
import { SaveButton } from '../../components/SaveButton';
import { CancelButton } from '../../components/CancelButton';
import { ActiveStatusToggle } from '../../components/ActiveStatusToggle';
import { ActiveToggleField } from '../../components/ActiveToggleField';
import { PencilIcon } from '../../icons/PencilIcon';
import { ArrowLeftIcon } from '../../icons/ArrowLeftIcon';
import { disscoCSConfig } from '../../dissco-cs-config';
import { institutionsApi, Institution, InstitutionInput, SitePageLang } from '../../api/cs-api';

const LANGUAGES = disscoCSConfig.supportedLanguages;

function defaultLang(currentLanguage: string): SitePageLang {
  return (LANGUAGES.find(lang => lang.code === currentLanguage)?.code ?? LANGUAGES[0].code) as SitePageLang;
}

const emptyDraft: InstitutionInput = {
  name: {},
  description: {},
  email: null,
  phone: null,
  website: null,
  logo: null,
  isActive: true,
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const InstitutionManagement: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data, isLoading, refetch } = useQuery('admin-institutions', () => institutionsApi.listAdmin());
  const institutions = data?.institutions ?? [];

  const [editingId, setEditingId] = useState<Institution['id'] | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draft, setDraft] = useState<InstitutionInput>(emptyDraft);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<SitePageLang>(defaultLang(i18n.language));
  const [pendingDeleteId, setPendingDeleteId] = useState<Institution['id'] | null>(null);

  const refresh = () => refetch();

  const startCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setLogoFileName(null);
    setSelectedLang(defaultLang(i18n.language));
    setIsFormOpen(true);
  };

  const startEdit = (institution: Institution) => {
    setEditingId(institution.id);
    setDraft({
      name: institution.name,
      description: institution.description,
      email: institution.email,
      phone: institution.phone,
      website: institution.website,
      logo: institution.logo,
      isActive: institution.is_active,
    });
    setLogoFileName(null);
    setSelectedLang(defaultLang(i18n.language));
    setIsFormOpen(true);
  };

  const cancelForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setDraft(emptyDraft);
    setLogoFileName(null);
  };

  const allNamesFilled = LANGUAGES.every(lang => (draft.name[lang.code] ?? '').trim().length > 0);
  const allDescriptionsFilled = LANGUAGES.every(lang => (draft.description[lang.code] ?? '').trim().length > 0);
  const canSave = allNamesFilled && allDescriptionsFilled &&!!draft.email?.trim() && !!draft.phone?.trim() && !!draft.website?.trim() && !!draft.logo?.trim();

  const save = async () => {
    if (!canSave) return;
    if (editingId !== null) {
      await institutionsApi.update(editingId, draft);
    } else {
      await institutionsApi.create(draft);
    }
    cancelForm();
    refresh();
  };

  const confirmDelete = async () => {
    if (pendingDeleteId === null) return;
    await institutionsApi.remove(pendingDeleteId);
    setPendingDeleteId(null);
    refresh();
  };

  const toggleActive = async (institution: Institution) => {
    await institutionsApi.update(institution.id, {
      name: institution.name,
      description: institution.description,
      email: institution.email,
      phone: institution.phone,
      website: institution.website,
      logo: institution.logo,
      isActive: !institution.is_active,
    });
    refresh();
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setDraft(prev => ({ ...prev, logo: dataUrl }));
    setLogoFileName(file.name);
  };

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">
          <HrefLink href="/manage" className="inline-flex items-center gap-1 text-[var(--cs-primary)] no-underline font-medium hover:underline">
            <ArrowLeftIcon aria-hidden="true" /> {t('sm_back_to_hub')}
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
                      <p className="font-semibold m-0 truncate">{institution.name.nl || institution.name.en || institution.slug}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <ActiveStatusToggle
                        active={institution.is_active}
                        onChange={() => void toggleActive(institution)}
                        label={institution.name.nl || institution.slug}
                      />
                      <button
                        onClick={() => startEdit(institution)}
                        aria-label={t('sm_pages_edit')}
                        title={t('sm_pages_edit')}
                        className="bg-transparent border-none cursor-pointer text-gray-500 hover:text-[var(--cs-primary)] p-1"
                      >
                        <PencilIcon />
                      </button>
                      <DeleteIconButton onClick={() => setPendingDeleteId(institution.id)} />
                    </div>
                  </li>
                ))}
              </ul>

              {isFormOpen && (
                <div className="w-full lg:flex-[0_0_42%] lg:min-w-[380px] bg-white border border-gray-200 rounded-[10px] p-6">
                  <h2 className="text-xl font-semibold text-[var(--cs-primary)] mb-4">
                    {editingId !== null ? t('sm_institutions_edit') : t('sm_institutions_new')}
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
                        {(!(draft.name[lang.code] ?? '').trim() || !(draft.description[lang.code] ?? '').trim()) && <span className="text-red-500 ml-1">•</span>}
                      </button>
                    ))}
                  </div>

                  <label className="flex flex-col gap-1 mb-4">
                    <span className="text-sm font-medium text-gray-700">{t('sm_institutions_field_name')} *</span>
                    <input
                      type="text"
                      value={draft.name[selectedLang] ?? ''}
                      onChange={e => setDraft(prev => ({ ...prev, name: { ...prev.name, [selectedLang]: e.target.value } }))}
                      className="border border-gray-300 rounded-lg p-2"
                    />
                  </label>

                  <label className="flex flex-col gap-1 mb-4">
                    <span className="text-sm font-medium text-gray-700">{t('sm_institutions_field_description')}*</span>
                    <textarea
                      value={draft.description[selectedLang] ?? ''}
                      onChange={e =>
                        setDraft(prev => ({ ...prev, description: { ...prev.description, [selectedLang]: e.target.value } }))
                      }
                      className="border border-gray-300 rounded-lg p-2 min-h-[90px]"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">{t('sm_institutions_field_email')}*</span>
                      <input
                        type="email"
                        value={draft.email ?? ''}
                        onChange={e => setDraft(prev => ({ ...prev, email: e.target.value || null }))}
                        className="border border-gray-300 rounded-lg p-2"
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">{t('sm_institutions_field_phone')}*</span>
                      <input
                        type="text"
                        value={draft.phone ?? ''}
                        onChange={e => setDraft(prev => ({ ...prev, phone: e.target.value || null }))}
                        className="border border-gray-300 rounded-lg p-2"
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-1 mb-4">
                    <span className="text-sm font-medium text-gray-700">{t('sm_institutions_field_website')}*</span>
                    <input
                      type="text"
                      value={draft.website ?? ''}
                      onChange={e => setDraft(prev => ({ ...prev, website: e.target.value || null }))}
                      className="border border-gray-300 rounded-lg p-2"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-4 mb-6 items-start">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">{t('sm_institutions_field_logo')}*</span>
                      <div className="flex items-center gap-3">
                        {draft.logo && (
                          <div
                            className="h-12 w-12 flex-shrink-0 bg-contain bg-center bg-no-repeat bg-gray-100 rounded"
                            style={{ backgroundImage: `url(${draft.logo})` }}
                          />
                        )}
                        <label className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-300 bg-transparent cursor-pointer hover:bg-gray-50 inline-block">
                          {t('sm_institutions_choose_file')}
                          <input type="file" accept="image/*" className="hidden" onChange={e => void handleLogoChange(e)} />
                        </label>
                        {logoFileName && <span className="text-sm text-gray-600 truncate">{logoFileName}</span>}
                      </div>
                    </div>

                    <ActiveToggleField
                      checked={draft.isActive}
                      onChange={() => setDraft(prev => ({ ...prev, isActive: !prev.isActive }))}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <SaveButton
                      onClick={() => void save()}
                      disabled={!canSave}
                      title={!canSave ? t('common_fill_required_fields') : undefined}
                    />
                    <CancelButton onClick={cancelForm} />
                    {!canSave && (
                      <span className="text-sm text-gray-500">{t('common_fill_required_fields')}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {pendingDeleteId !== null && (
            <ConfirmDialog
              title={t('sm_institutions_confirm_delete_title')}
              message={t('sm_institutions_confirm_delete')}
              confirmLabel={t('common_delete')}
              cancelLabel={t('common_cancel')}
              onConfirm={() => void confirmDelete()}
              onCancel={() => setPendingDeleteId(null)}
            />
          )}
        </div>
      </div>
    </CsPage>
  );
};
