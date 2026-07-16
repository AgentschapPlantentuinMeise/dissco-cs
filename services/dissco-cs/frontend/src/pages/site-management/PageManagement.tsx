import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HrefLink } from '../../utility/href-link';
import { CsPage } from '../../components/CsPage';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { PencilIcon } from '../../icons/PencilIcon';
import { ArrowUpIcon } from '../../icons/ArrowUpIcon';
import { ArrowDownIcon } from '../../icons/ArrowDownIcon';
import { ArrowLeftIcon } from '../../icons/ArrowLeftIcon';
import { disscoCSConfig } from '../../dissco-cs-config';
import { sitePagesApi, SitePage, SitePageKey, SitePageLang } from '../../api/cs-api';
import { useSitePages } from '../../contexts/SitePagesContext';

const CONTENT_PAGE_KEYS: SitePageKey[] = ['about', 'help', 'contact', 'welcome'];
const LANGUAGES = disscoCSConfig.supportedLanguages;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PageManagement: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const { pages, loading, refresh } = useSitePages();
  const [selectedKey, setSelectedKey] = useState<SitePageKey | null>(null);
  const [selectedLang, setSelectedLang] = useState<SitePageLang>(LANGUAGES[0].code);
  const [draftContent, setDraftContent] = useState<SitePage['content']>({});
  const [draftContactEmail, setDraftContactEmail] = useState('');
  const [draftShowContactForm, setDraftShowContactForm] = useState(true);
  const [saved, setSaved] = useState(false);

  // Pages are fetched once on app load; re-fetch on entering this screen so content added
  // directly in the database (or saved from another tab) is reflected here.
  useEffect(() => {
    refresh();
  }, []);

  // Only (re-)initialize the draft when switching pages, never when `pages` changes in the
  // background (e.g. a toggle elsewhere triggers a refresh) — otherwise in-progress edits and
  // the "saved" confirmation would be wiped out a moment after saving.
  useEffect(() => {
    if (!selectedKey || loading) return;
    const page = pages.find(p => p.page_key === selectedKey);
    setDraftContent(page?.content ?? {});
    setDraftContactEmail(page?.contact_email ?? '');
    setDraftShowContactForm(page?.show_contact_form ?? true);
    setSaved(false);
  }, [selectedKey, loading]);

  const isActive = (key: SitePageKey) => pages.find(p => p.page_key === key)?.is_active ?? true;

  const toggleActive = async (key: SitePageKey) => {
    await sitePagesApi.setActive(key, !isActive(key));
    refresh();
  };

  const movePage = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    const reordered = [...pages];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    await sitePagesApi.setOrder(reordered.map(p => p.page_key));
    refresh();
  };

  const allLangsFilled = LANGUAGES.every(lang => (draftContent[lang.code] ?? '').trim().length > 0);
  const isContact = selectedKey === 'contact';
  const emailValid = !isContact || !draftShowContactForm || EMAIL_PATTERN.test(draftContactEmail.trim());
  const canSave = allLangsFilled && emailValid;

  const saveContent = async () => {
    if (!selectedKey || !canSave) return;
    await Promise.all([
      ...LANGUAGES.map(lang => sitePagesApi.setContent(selectedKey, lang.code, draftContent[lang.code] ?? '')),
      ...(isContact ? [sitePagesApi.setShowContactForm(draftShowContactForm)] : []),
      ...(isContact && draftShowContactForm ? [sitePagesApi.setContactEmail(draftContactEmail.trim())] : []),
    ]);
    refresh();
    setSaved(true);
  };

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container">
          <HrefLink href="/beheer" className="inline-flex items-center gap-1 text-[var(--cs-primary)] no-underline font-medium hover:underline">
            <ArrowLeftIcon aria-hidden="true" /> {t('sm_back_to_hub')}
          </HrefLink>

          <h1 className="text-3xl text-[var(--cs-primary)] mt-4 mb-6">{t('sm_tile_pages_title')}</h1>

          <div className={`grid grid-cols-1 gap-6 ${selectedKey ? 'md:grid-cols-[380px_1fr]' : ''}`}>
            <ul className="list-none m-0 p-0 bg-white rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] divide-y divide-gray-100">
              {pages.map((page, index) => {
                const key = page.page_key;
                return (
                  <li
                    key={key}
                    className={`flex items-center justify-between gap-2 px-4 py-3 ${
                      selectedKey === key ? 'bg-gray-50' : ''
                    }`}
                  >
                    <span
                      className={`truncate min-w-0 ${selectedKey === key ? 'font-semibold' : ''}`}
                      title={t(`sm_pages_page_${key}`)}
                    >
                      {t(`sm_pages_page_${key}`)}
                    </span>

                    <span className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-gray-500 w-12">
                        {isActive(key) ? t('sm_pages_active') : t('sm_pages_inactive')}
                      </span>

                      <ToggleSwitch
                        checked={isActive(key)}
                        onChange={() => void toggleActive(key)}
                        label={t(`sm_pages_page_${key}`)}
                      />

                      <span className="w-7 flex justify-center">
                        {CONTENT_PAGE_KEYS.includes(key) && (
                          <button
                            onClick={() => setSelectedKey(key)}
                            aria-label={t('sm_pages_edit')}
                            className="bg-transparent border-none cursor-pointer text-gray-500 hover:text-[var(--cs-primary)] p-1"
                          >
                            <PencilIcon />
                          </button>
                        )}
                      </span>

                      <span className="flex items-center border-l border-gray-200 pl-3 ml-1">
                        <button
                          onClick={() => void movePage(index, -1)}
                          disabled={index === 0}
                          aria-label={t('sm_pages_move_up')}
                          className="flex items-center bg-transparent border-none cursor-pointer text-gray-400 hover:text-[var(--cs-primary)] disabled:opacity-25 disabled:cursor-not-allowed p-1"
                        >
                          <ArrowUpIcon />
                        </button>
                        <button
                          onClick={() => void movePage(index, 1)}
                          disabled={index === pages.length - 1}
                          aria-label={t('sm_pages_move_down')}
                          className="flex items-center bg-transparent border-none cursor-pointer text-gray-400 hover:text-[var(--cs-primary)] disabled:opacity-25 disabled:cursor-not-allowed p-1"
                        >
                          <ArrowDownIcon />
                        </button>
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>

            {selectedKey && (
              <div className="bg-white rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-[var(--cs-primary)]">
                    {t(`sm_pages_page_${selectedKey}`)}
                  </h2>
                  <button
                    onClick={() => setSelectedKey(null)}
                    aria-label={t('sm_pages_close')}
                    className="bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-800 text-lg leading-none p-1"
                  >
                    ✕
                  </button>
                </div>

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
                      {!(draftContent[lang.code] ?? '').trim() && <span className="text-red-500 ml-1">•</span>}
                    </button>
                  ))}
                </div>

                <textarea
                  value={draftContent[selectedLang] ?? ''}
                  onChange={e => {
                    setDraftContent(prev => ({ ...prev, [selectedLang]: e.target.value }));
                    setSaved(false);
                  }}
                  placeholder={t('sm_pages_content_placeholder')}
                  className="w-full min-h-[260px] border border-gray-300 rounded-lg p-3 font-mono text-sm"
                />

                {selectedKey === 'welcome' && (
                  <p className="text-sm text-gray-500 mt-2">
                    {t('sm_pages_welcome_hint')} <code>{'{{name}}'}</code>
                  </p>
                )}

                {isContact && (
                  <>
                    <div className="flex items-center gap-3 mt-4">
                      <ToggleSwitch
                        checked={draftShowContactForm}
                        onChange={() => {
                          setDraftShowContactForm(prev => !prev);
                          setSaved(false);
                        }}
                        label={t('sm_pages_contact_show_form')}
                      />
                      <span className="text-sm font-medium text-gray-700">{t('sm_pages_contact_show_form')}</span>
                    </div>

                    {draftShowContactForm && (
                      <label className="flex flex-col gap-1 mt-4">
                        <span className="text-sm font-medium text-gray-700">{t('sm_pages_contact_email_label')}</span>
                        <input
                          type="email"
                          value={draftContactEmail}
                          onChange={e => {
                            setDraftContactEmail(e.target.value);
                            setSaved(false);
                          }}
                          placeholder={t('sm_pages_contact_email_placeholder')}
                          className="border border-gray-300 rounded-lg p-2 max-w-sm"
                        />
                      </label>
                    )}
                  </>
                )}

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => void saveContent()}
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

                  {!allLangsFilled && (
                    <span className="text-sm text-gray-500">{t('sm_pages_fill_all_langs')}</span>
                  )}
                  {allLangsFilled && !emailValid && (
                    <span className="text-sm text-gray-500">{t('sm_pages_contact_email_invalid')}</span>
                  )}
                </div>

                {saved && (
                  <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-2">
                    <span aria-hidden="true">✓</span>
                    <span className="text-sm font-medium">{t('sm_pages_saved')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </CsPage>
  );
};
