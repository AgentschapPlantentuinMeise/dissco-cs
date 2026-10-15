import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HrefLink } from '../../../utility/href-link';
import { CsPage } from '../../../components/layout/CsPage';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { SaveButton } from '../../../components/ui/SaveButton';
import { ActiveStatusToggle } from '../../../components/ui/ActiveStatusToggle';
import { LuPencil, LuArrowUp, LuArrowDown, LuArrowLeft, LuCheck, LuX } from 'react-icons/lu';
import { navItemsApi } from '../../../api/cs-client/nav-items';
import { navItemKeys, navItemQueries } from '../../../api/queries/nav-items';
import { setContactEmailSchema, NavItemDto, NavItemKey, SitePageLang } from '@dissco-cs/shared-types';
import { LANGUAGES, defaultLang } from '../../../utility/site-lang-text';
import { LanguageTabs } from '../../../components/ui/LanguageTabs';
import { useNavItems } from '../../../hooks/use-nav-items';
import { MarkdownToolbar } from '../../../components/ui/MarkdownToolbar';

const CONTENT_PAGE_KEYS: NavItemKey[] = ['about', 'help', 'contact', 'welcome'];

// contact/help/forum/institutions share their title with the navbar and public page,
// so they resolve to that single translation key; about/welcome keep their own
// (shorter / distinct) label here, hence the fallback.
const MERGED_PAGE_TITLE_KEY: Partial<Record<NavItemKey, string>> = {
  contact: 'nav_contact',
  help: 'nav_help',
  forum: 'nav_forum',
  institutions: 'nav_institutions',
};
const pageLabelKey = (key: NavItemKey) => MERGED_PAGE_TITLE_KEY[key] ?? `sm_pages_page_${key}`;

export const PageManagement: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { navItems: pages, loading, refresh } = useNavItems();
  const { data: contactEmail, isPending: contactEmailLoading } = useQuery(navItemQueries.contactEmail());
  const [selectedKey, setSelectedKey] = useState<NavItemKey | null>(null);
  const [selectedLang, setSelectedLang] = useState<SitePageLang>(defaultLang(i18n.language));
  const [draftContent, setDraftContent] = useState<NavItemDto['content']>({});
  const [draftContactEmail, setDraftContactEmail] = useState('');
  const [draftShowContactForm, setDraftShowContactForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pages are fetched once on app load; re-fetch on entering this screen so content added
  // directly in the database (or saved from another tab) is reflected here.
  useEffect(() => {
    refresh();
  }, []);

  // Only (re-)initialize the draft when switching pages, never when `pages` changes in the
  // background (e.g. a toggle elsewhere triggers a refresh) — otherwise in-progress edits and
  // the "saved" confirmation would be wiped out a moment after saving.
  useEffect(() => {
    if (!selectedKey || loading || contactEmailLoading) return;
    const page = pages.find(p => p.pageKey === selectedKey);
    setDraftContent(page?.content ?? {});
    setDraftContactEmail(contactEmail?.email ?? '');
    setDraftShowContactForm(page?.showContactForm ?? false);
    setSaved(false);
  }, [selectedKey, loading, contactEmailLoading]);

  const isActive = (key: NavItemKey) => pages.find(p => p.pageKey === key)?.isActive ?? true;

  const queryClient = useQueryClient();
  const onWritten = () => queryClient.invalidateQueries({ queryKey: navItemKeys.all });

  const { mutate: setActive } = useMutation({
    mutationFn: ({ key, active }: { key: NavItemKey; active: boolean }) => navItemsApi.setActive(key, active),
    onSuccess: onWritten,
  });

  const { mutate: setShowContactForm } = useMutation({
    mutationFn: (show: boolean) => navItemsApi.setShowContactForm(show),
    onSuccess: onWritten,
  });

  const { mutate: setOrder } = useMutation({
    mutationFn: (keys: NavItemKey[]) => navItemsApi.setOrder(keys),
    onSuccess: onWritten,
  });

  const toggleActive = (key: NavItemKey) => setActive({ key, active: !isActive(key) });

  const toggleShowContactForm = () => {
    const next = !draftShowContactForm;
    setDraftShowContactForm(next);
    setSaved(false);
    setShowContactForm(next, { onError: () => setDraftShowContactForm(!next) });
  };

  const movePage = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    const reordered = [...pages];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setOrder(reordered.map(p => p.pageKey));
  };

  const allLangsFilled = LANGUAGES.every(lang => (draftContent[lang.code] ?? '').trim().length > 0);
  const isContact = selectedKey === 'contact';
  const emailValid =
    !isContact || !draftShowContactForm || setContactEmailSchema.safeParse({ email: draftContactEmail.trim() }).success;
  const canSave = allLangsFilled && emailValid;

  const { mutate: saveAllContent } = useMutation({
    mutationFn: (key: NavItemKey) =>
      Promise.all([
        ...LANGUAGES.map(lang => navItemsApi.setContent(key, lang.code, draftContent[lang.code] ?? '')),
        ...(isContact && draftShowContactForm ? [navItemsApi.setContactEmail(draftContactEmail.trim())] : []),
      ]),
    onSuccess: () => {
      setSaved(true);
      return onWritten();
    },
  });

  const saveContent = () => {
    if (!selectedKey || !canSave) return;
    saveAllContent(selectedKey);
  };

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">
          <HrefLink href="/manage" className="inline-flex items-center gap-1 text-[var(--cs-primary)] no-underline font-medium hover:underline">
            <LuArrowLeft aria-hidden="true" /> {t('sm_back_to_hub')}
          </HrefLink>

          <h1 className="text-3xl text-[var(--cs-primary)] mt-4 mb-6">{t('sm_tile_pages_title')}</h1>

          <div className={`grid grid-cols-1 gap-6 ${selectedKey ? 'md:grid-cols-[380px_1fr]' : ''}`}>
            <ul className="list-none m-0 p-0 bg-white border-t border-gray-200 divide-y divide-gray-100">
              {pages.map((page, index) => {
                const key = page.pageKey;
                return (
                  <li
                    key={key}
                    className={`flex items-center justify-between gap-2 px-4 py-3 ${
                      selectedKey === key ? 'bg-gray-50' : ''
                    }`}
                  >
                    <span
                      className={`truncate min-w-0 ${selectedKey === key ? 'font-semibold' : ''}`}
                      title={t(pageLabelKey(key))}
                    >
                      {t(pageLabelKey(key))}
                    </span>

                    <span className="flex items-center gap-3 flex-shrink-0">
                      <ActiveStatusToggle
                        active={isActive(key)}
                        onChange={() => toggleActive(key)}
                        label={t(pageLabelKey(key))}
                        labelWidthClassName="w-12"
                      />

                      <span className="w-7 flex justify-center">
                        {CONTENT_PAGE_KEYS.includes(key) && (
                          <button
                            onClick={() => setSelectedKey(key)}
                            aria-label={t('sm_pages_edit')}
                            className="bg-transparent border-none cursor-pointer text-gray-500 hover:text-[var(--cs-primary)] p-1"
                          >
                            <LuPencil />
                          </button>
                        )}
                      </span>

                      <span className="flex items-center border-l border-gray-200 pl-3 ml-1">
                        <button
                          onClick={() => movePage(index, -1)}
                          disabled={index === 0}
                          aria-label={t('sm_pages_move_up')}
                          className="flex items-center bg-transparent border-none cursor-pointer text-gray-400 hover:text-[var(--cs-primary)] disabled:opacity-25 disabled:cursor-not-allowed p-1"
                        >
                          <LuArrowUp />
                        </button>
                        <button
                          onClick={() => movePage(index, 1)}
                          disabled={index === pages.length - 1}
                          aria-label={t('sm_pages_move_down')}
                          className="flex items-center bg-transparent border-none cursor-pointer text-gray-400 hover:text-[var(--cs-primary)] disabled:opacity-25 disabled:cursor-not-allowed p-1"
                        >
                          <LuArrowDown />
                        </button>
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>

            {selectedKey && (
              <div className="bg-white border border-gray-200 rounded-[10px] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-[var(--cs-primary)]">
                    {t(pageLabelKey(selectedKey))}
                  </h2>
                  <button
                    onClick={() => setSelectedKey(null)}
                    aria-label={t('common_close')}
                    className="bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-800 text-lg leading-none p-1"
                  >
                    <LuX aria-hidden="true" />
                  </button>
                </div>

                <LanguageTabs
                  selected={selectedLang}
                  onSelect={setSelectedLang}
                  isMissing={lang => !(draftContent[lang] ?? '').trim()}
                />

                <MarkdownToolbar
                  textareaRef={textareaRef}
                  value={draftContent[selectedLang] ?? ''}
                  onChange={next => {
                    setDraftContent(prev => ({ ...prev, [selectedLang]: next }));
                    setSaved(false);
                  }}
                />
                <textarea
                  ref={textareaRef}
                  value={draftContent[selectedLang] ?? ''}
                  onChange={e => {
                    setDraftContent(prev => ({ ...prev, [selectedLang]: e.target.value }));
                    setSaved(false);
                  }}
                  placeholder={t('sm_pages_content_placeholder')}
                  className="w-full min-h-[260px] border border-gray-300 rounded-b-lg p-3 font-mono text-sm"
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
                        onChange={toggleShowContactForm}
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
                  <SaveButton
                    onClick={saveContent}
                    disabled={!canSave}
                    title={!canSave ? t('common_fill_required_fields') : undefined}
                  />

                  {!allLangsFilled && (
                    <span className="text-sm text-gray-500">{t('common_fill_required_fields')}</span>
                  )}
                  {allLangsFilled && !emailValid && (
                    <span className="text-sm text-gray-500">{t('sm_pages_contact_email_invalid')}</span>
                  )}
                </div>

                {saved && (
                  <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-2">
                    <LuCheck aria-hidden="true" />
                    <span className="text-sm font-medium">{t('common_saved')}</span>
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
