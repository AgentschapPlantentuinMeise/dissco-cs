import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CsPage } from '../../../components/layout/CsPage';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBody } from '../../../components/layout/PageBody';
import { ManageLoadError } from '../ManageLoadError';
import { failedToLoad } from '../../../api/query-state';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { SaveButton } from '../../../components/ui/SaveButton';
import { SavedNotice } from '../../../components/ui/SavedNotice';
import { ActiveStatusToggle } from '../../../components/ui/ActiveStatusToggle';
import { LuPencil } from 'react-icons/lu';
import { CancelButton } from '../../../components/ui/CancelButton';
import { DiscardDialog } from '../../../components/ui/DiscardDialog';
import { useDiscardGuard } from '../../../hooks/use-discard-guard';
import { hasDraftChanged } from '../../../utility/draft-changes';
import { ListWithPanel } from '../../../components/layout/ListWithPanel';
import { useSavedFlash } from '../../../hooks/use-saved-flash';
import { IconButton } from '../../../components/ui/IconButton';
import { navItemsApi } from '../../../api/cs-client/nav-items';
import { navItemKeys, navItemQueries } from '../../../api/queries/nav-items';
import {
  MAX_EMAIL_LENGTH,
  MAX_NAV_ITEM_CONTENT_LENGTH,
  MAX_NAV_ITEM_INTRO_LENGTH,
  setContactEmailSchema,
  NavItemDto,
  NavItemKey,
  SitePageLang,
} from '@dissco-cs/shared-types';
import { LANGUAGES, defaultLang } from '../../../utility/site-lang-text';
import { LanguageTabs } from '../../../components/ui/LanguageTabs';
import { useNavItems } from '../../../hooks/use-nav-items';
import { MarkdownToolbar } from '../../../components/ui/MarkdownToolbar';
import { rowHoverClass, savedRowClass } from '../../../components/ui/list-styles';
import { inputClass } from '../../../components/ui/input-styles';
import { FormField } from '../../../components/ui/FormField';

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

// The sentence a page shows under its title when its intro is left empty. About has none: a
// general sentence says little there.
const DEFAULT_INTRO_KEY: Partial<Record<NavItemKey, string>> = {
  help: 'help_intro_default',
  contact: 'contact_intro_default',
};

export function PageManagement() {
  const { t, i18n } = useTranslation('dissco-cs');
  const { navItems: pages, loading, isError: pagesError, refresh } = useNavItems();
  const contactEmailQuery = useQuery(navItemQueries.contactEmail());
  const { data: contactEmail, isPending: contactEmailLoading } = contactEmailQuery;
  const [selectedKey, setSelectedKey] = useState<NavItemKey | null>(null);
  const [selectedLang, setSelectedLang] = useState<SitePageLang>(defaultLang(i18n.language));
  const [draftContent, setDraftContent] = useState<NavItemDto['content']>({});
  const [draftIntro, setDraftIntro] = useState<NavItemDto['intro']>({});
  const [draftContactEmail, setDraftContactEmail] = useState('');
  const [draftShowContactForm, setDraftShowContactForm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pages are fetched once on app load; re-fetch on entering this screen so content added
  // directly in the database (or saved from another tab) is reflected here.
  useEffect(() => {
    refresh();
  }, []);

  // Only (re-)initialize the draft when switching pages, never when `pages` changes in the
  // background (e.g. a toggle elsewhere triggers a refresh) — otherwise in-progress edits would be
  // wiped out.
  useEffect(() => {
    if (!selectedKey || loading || contactEmailLoading) return;
    const page = pages.find(p => p.pageKey === selectedKey);
    setDraftContent(page?.content ?? {});
    setDraftIntro(page?.intro ?? {});
    setDraftContactEmail(contactEmail?.email ?? '');
    setDraftShowContactForm(page?.showContactForm ?? false);
  }, [selectedKey, loading, contactEmailLoading]);

  const selectedPage = pages.find(p => p.pageKey === selectedKey);
  const discardGuard = useDiscardGuard(
    selectedKey !== null &&
      hasDraftChanged(
        { content: draftContent, intro: draftIntro, email: draftContactEmail, showForm: draftShowContactForm },
        { content: selectedPage?.content ?? {}, intro: selectedPage?.intro ?? {}, email: contactEmail?.email ?? '', showForm: selectedPage?.showContactForm ?? false }
      )
  );

  const isActive = (key: NavItemKey) => pages.find(p => p.pageKey === key)?.isActive ?? true;

  const queryClient = useQueryClient();
  const onWritten = () => queryClient.invalidateQueries({ queryKey: navItemKeys.all });
  const { savedId: savedKey, flash } = useSavedFlash<NavItemKey>();

  const { mutate: setActive } = useMutation({
    mutationFn: ({ key, active }: { key: NavItemKey; active: boolean }) => navItemsApi.setActive(key, active),
    onSuccess: onWritten,
  });

  const toggleActive = (key: NavItemKey) => setActive({ key, active: !isActive(key) });

  const allLangsFilled = LANGUAGES.every(lang => (draftContent[lang.code] ?? '').trim().length > 0);
  const isContact = selectedKey === 'contact';
  const defaultIntroKey = selectedKey ? DEFAULT_INTRO_KEY[selectedKey] : undefined;
  const emailValid =
    !isContact || !draftShowContactForm || setContactEmailSchema.safeParse({ email: draftContactEmail.trim() }).success;
  const canSave = allLangsFilled && emailValid;

  const { mutate: saveAllContent, isPending: savingContent } = useMutation({
    mutationFn: (key: NavItemKey) =>
      Promise.all([
        ...LANGUAGES.map(lang =>
          navItemsApi.setContent(key, lang.code, draftContent[lang.code] ?? '', (draftIntro[lang.code] ?? '').trim())
        ),
        ...(isContact ? [navItemsApi.setShowContactForm(draftShowContactForm)] : []),
        ...(isContact && draftShowContactForm ? [navItemsApi.setContactEmail(draftContactEmail.trim())] : []),
      ]),
    onSuccess: async (_result, key) => {
      await onWritten();
      setSelectedKey(null);
      flash(key);
    },
  });

  const saveContent = () => {
    if (!selectedKey || !canSave) return;
    saveAllContent(selectedKey);
  };

  // Without the real pages the list would show defaults (every page on, every text empty).
  if (pagesError || failedToLoad(contactEmailQuery)) {
    return <ManageLoadError />;
  }

  return (
    <CsPage>
      <PageBody>
        <PageHeader variant="plain" back={{ href: '/manage', label: t('sm_back_to_hub') }} title={t('sm_tile_pages_title')} />

        <ListWithPanel
          panelKey={selectedKey}
          panelTitle={selectedKey && t(pageLabelKey(selectedKey))}
          onClose={() => discardGuard.guard(() => setSelectedKey(null))}
          list={
          <ul className="list-none m-0 p-0 bg-white border-t border-gray-200 divide-y divide-gray-100">
            {pages.map(page => {
              const key = page.pageKey;
              return (
                <li
                  key={key}
                  className={`flex items-center justify-between gap-2 px-4 py-3 border-l-4 ${rowHoverClass} ${
                    selectedKey === key ? 'bg-gray-50 border-l-cs-primary' : savedKey === key ? savedRowClass : 'border-l-transparent'
                  }`}
                >
                  <span
                    className={`truncate min-w-0 ${selectedKey === key ? 'font-semibold' : ''}`}
                    title={t(pageLabelKey(key))}
                  >
                    {t(pageLabelKey(key))}
                  </span>

                  <span className="flex items-center gap-3 flex-shrink-0">
                    {savedKey === key && <SavedNotice />}
                    <ActiveStatusToggle
                      active={isActive(key)}
                      onChange={() => toggleActive(key)}
                      label={t(pageLabelKey(key))}
                      labelWidthClassName="w-12"
                    />

                    <span className="w-7 flex justify-center">
                      {CONTENT_PAGE_KEYS.includes(key) && (
                        <IconButton icon={LuPencil} label={t('sm_pages_edit')} onClick={() => discardGuard.guard(() => setSelectedKey(key))} />
                      )}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          }
          panel={selectedKey ? (
            <div>
              <LanguageTabs
                selected={selectedLang}
                onSelect={setSelectedLang}
                isMissing={lang => !(draftContent[lang] ?? '').trim()}
              />

              {selectedKey !== 'welcome' && (
                <FormField label={t('sm_pages_intro_label')} className="mb-4">
                  <input
                    type="text"
                    value={draftIntro[selectedLang] ?? ''}
                    onChange={e => {
                      setDraftIntro(prev => ({ ...prev, [selectedLang]: e.target.value }));
                    }}
                    maxLength={MAX_NAV_ITEM_INTRO_LENGTH}
                    className={inputClass}
                  />
                  <span className="text-xs text-gray-500">
                    {defaultIntroKey
                      ? t('sm_pages_intro_hint_default', { text: t(defaultIntroKey) })
                      : t('sm_pages_intro_hint_empty')}
                  </span>
                </FormField>
              )}

              <MarkdownToolbar
                textareaRef={textareaRef}
                value={draftContent[selectedLang] ?? ''}
                onChange={next => {
                  setDraftContent(prev => ({ ...prev, [selectedLang]: next }));
                }}
              />
              <textarea
                ref={textareaRef}
                value={draftContent[selectedLang] ?? ''}
                onChange={e => {
                  setDraftContent(prev => ({ ...prev, [selectedLang]: e.target.value }));
                }}
                maxLength={MAX_NAV_ITEM_CONTENT_LENGTH}
                placeholder={t('sm_pages_content_placeholder')}
                className={`${inputClass} w-full min-h-[260px] rounded-t-none font-mono`}
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
                      onChange={() => setDraftShowContactForm(show => !show)}
                      label={t('sm_pages_contact_show_form')}
                    />
                    <span className="text-sm font-medium text-gray-700">{t('sm_pages_contact_show_form')}</span>
                  </div>

                  {draftShowContactForm && (
                    <FormField label={t('sm_pages_contact_email_label')} className="mt-4">
                      <input
                        type="email"
                        value={draftContactEmail}
                        onChange={e => {
                          setDraftContactEmail(e.target.value);
                        }}
                        maxLength={MAX_EMAIL_LENGTH}
                        placeholder={t('sm_pages_contact_email_placeholder')}
                        className={`${inputClass} max-w-sm`}
                      />
                    </FormField>
                  )}
                </>
              )}

              <div className="flex items-center gap-3 mt-4">
                <SaveButton
                  onClick={saveContent}
                  loading={savingContent}
                  disabled={!canSave}
                  title={!canSave ? t('common_fill_required_fields') : undefined}
                />
                <CancelButton onClick={() => discardGuard.guard(() => setSelectedKey(null))} />

                {!allLangsFilled && (
                  <span className="text-sm text-gray-500">{t('common_fill_required_fields')}</span>
                )}
                {allLangsFilled && !emailValid && (
                  <span className="text-sm text-gray-500">{t('sm_pages_contact_email_invalid')}</span>
                )}
              </div>
            </div>
          ) : null}
        />

        <DiscardDialog guard={discardGuard} />
      </PageBody>
    </CsPage>
  );
}
