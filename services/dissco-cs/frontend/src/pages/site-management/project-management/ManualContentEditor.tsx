import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { manualQueries } from '../../../api/queries/manuals';
import { projectKeys } from '../../../api/queries/projects';
import { manualsApi } from '../../../api/cs-client/manuals';
import { MAX_MANUAL_ATTACHMENT_LENGTH, SitePageLang } from '@dissco-cs/shared-types';
import { SaveButton } from '../../../components/SaveButton';
import { DeleteIconButton } from '../../../components/DeleteIconButton';
import { MarkdownToolbar } from '../../../components/MarkdownToolbar';
import { LuCheck } from 'react-icons/lu';
import { LANGUAGES, defaultLang } from '../../../utility/site-lang-text';

// Shared editor for a manual's content (language tabs + markdown toolbar/textarea +
// attachment). Reused by both the per-project panel and the manual-library "Bewerken" row,
// so editing behaves identically no matter where it's opened from.
export const ManualContentEditor: React.FC<{ manualId: number }> = ({ manualId }) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const queryClient = useQueryClient();
  const { data: manual, refetch } = useQuery(manualQueries.detail(manualId));
  const [selectedLang, setSelectedLang] = useState<SitePageLang>(defaultLang(i18n.language));
  const [draftContent, setDraftContent] = useState<Partial<Record<SitePageLang, string>>>({});
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [uploading, setUploading] = useState(false);
  const [attachmentSaved, setAttachmentSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (manual) {
      setDraftContent(manual.content ?? {});
      setSaveState('idle');
    }
    // Enkel bij een echte wissel van handleiding herinitialiseren -- niet op manual.updated_at,
    // want dat verandert ook na onze eigen succesvolle save (via refetch), wat anders de
    // net gezette 'saved'-status meteen weer terug naar 'idle' zou zetten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manual?.id]);

  if (!manual) {
    return <p className="text-sm text-gray-500">{t('sm_manuals_loading')}</p>;
  }

  const attachment = manual.attachments[selectedLang];
  // Elke taal telt als ingevuld zodra ze tekst OF een bijlage heeft -- gemengd (tekst in de ene
  // taal, bijlage in de andere) moet dus ook kunnen. Pas opslaan zodra geen enkele taal nog leeg is.
  const langHasContent = (lang: (typeof LANGUAGES)[number]) =>
    !!(draftContent[lang.code] ?? '').trim() || !!manual.attachments[lang.code];
  const hasAnyContent = LANGUAGES.some(langHasContent);
  const missingLangs = hasAnyContent ? LANGUAGES.filter(lang => !langHasContent(lang)) : [];
  const canSave = hasAnyContent && missingLangs.length === 0;

  const save = async () => {
    if (!canSave) return;
    setSaveState('saving');
    try {
      await Promise.all(
        LANGUAGES.map(lang => manualsApi.setContent(manual.id, lang.code, draftContent[lang.code] ?? ''))
      );
      await refetch();
      // The public manual popup reads its own cached query (projectQueries.manual), which would
      // otherwise only show the new content after its staleTime (5 min) or a hard refresh.
      queryClient.invalidateQueries({ queryKey: projectKeys.manuals() });
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const onPickFile = async (file: File) => {
    if (file.size > MAX_MANUAL_ATTACHMENT_LENGTH) {
      window.alert(t('sm_manuals_attachment_too_large'));
      return;
    }
    setUploading(true);
    setAttachmentSaved(false);
    try {
      await manualsApi.uploadAttachment(manual.id, selectedLang, file);
      await refetch();
      queryClient.invalidateQueries({ queryKey: projectKeys.manuals() });
      setAttachmentSaved(true);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async () => {
    await manualsApi.deleteAttachment(manual.id, selectedLang);
    await refetch();
    queryClient.invalidateQueries({ queryKey: projectKeys.manuals() });
    setAttachmentSaved(false);
  };

  // Voegt {{attachment}} in op de cursorpositie -- ManualModal bedt de bijlage-galerij
  // daar exact in i.p.v. steeds achteraan alle secties te tonen.
  const insertAttachmentMarker = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = draftContent[selectedLang] ?? '';
    const marker = '\n\n{{attachment}}\n\n';
    const next = current.slice(0, start) + marker + current.slice(end);
    setDraftContent(prev => ({ ...prev, [selectedLang]: next }));
    setSaveState('idle');
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + marker.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => {
              setSelectedLang(lang.code);
              setAttachmentSaved(false);
            }}
            className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1.5 ${
              selectedLang === lang.code
                ? 'bg-[var(--cs-primary)] text-white border-[var(--cs-primary)]'
                : 'bg-transparent text-gray-600 border-gray-300'
            }`}
          >
            {t(`lang_${lang.code}`)}
            {missingLangs.includes(lang) && (
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  selectedLang === lang.code ? 'bg-white' : 'bg-red-500'
                }`}
                title={t('sm_manuals_lang_missing')}
              />
            )}
          </button>
        ))}
      </div>

      <MarkdownToolbar
        textareaRef={textareaRef}
        value={draftContent[selectedLang] ?? ''}
        onChange={next => {
          setDraftContent(prev => ({ ...prev, [selectedLang]: next }));
          setSaveState('idle');
        }}
      />
      <textarea
        ref={textareaRef}
        value={draftContent[selectedLang] ?? ''}
        onChange={e => {
          setDraftContent(prev => ({ ...prev, [selectedLang]: e.target.value }));
          setSaveState('idle');
        }}
        placeholder={t('sm_manuals_content_placeholder')}
        className="w-full min-h-[220px] border border-gray-300 rounded-b-lg p-3 font-mono text-sm"
      />
      <p className="text-xs text-gray-500 mt-1.5">{t('sm_manuals_heading_hint')}</p>
      <p className="text-xs text-gray-500 mt-0.5">{t('sm_manuals_attachment_marker_hint')}</p>
      {missingLangs.length > 0 && (
        <p className="text-xs text-red-600 mt-1">
          {t('sm_manuals_missing_langs', { langs: missingLangs.map(lang => t(`lang_${lang.code}`)).join(', ') })}
        </p>
      )}
      {!hasAnyContent && (
        <p className="text-xs text-red-600 mt-1">{t('sm_manuals_needs_content')}</p>
      )}

      <div className="flex items-center justify-between gap-3 mt-4 px-3.5 py-2.5 bg-gray-50 rounded-lg text-sm">
        {attachment ? (
          <>
            <span className="truncate">
              {attachment.filename} · {(attachment.size / 1_000_000).toFixed(1)} MB
            </span>
            <span className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={insertAttachmentMarker}
                className="text-xs font-semibold border border-[var(--cs-primary)] text-[var(--cs-primary)] rounded px-2.5 py-1 bg-white cursor-pointer hover:bg-gray-50"
              >
                {t('sm_manuals_attachment_insert_marker')}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold border border-[var(--cs-primary)] text-[var(--cs-primary)] rounded px-2.5 py-1 bg-white cursor-pointer hover:bg-gray-50"
              >
                {t('sm_manuals_attachment_replace')}
              </button>
              <DeleteIconButton onClick={() => void removeAttachment()} />
            </span>
          </>
        ) : (
          <>
            <span className="text-gray-500">{t('sm_manuals_attachment_none')}</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs font-semibold border border-[var(--cs-primary)] text-[var(--cs-primary)] rounded px-2.5 py-1 bg-white cursor-pointer hover:bg-gray-50 disabled:opacity-50"
            >
              {uploading ? t('sm_manuals_attachment_uploading') : t('sm_manuals_attachment_add')}
            </button>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              void onPickFile(file);
            }
            e.target.value = '';
          }}
        />
      </div>
      {attachmentSaved && (
        <p className="flex items-center gap-2 text-sm text-green-700 mt-2">
          <LuCheck aria-hidden="true" /> {t('sm_manuals_attachment_saved')}
        </p>
      )}

      <div className="flex items-center gap-3 mt-4">
        <SaveButton onClick={() => void save()} disabled={!canSave} loading={saveState === 'saving'} />
        {saveState === 'saved' && (
          <span className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            <LuCheck aria-hidden="true" /> {t('common_saved')}
          </span>
        )}
        {saveState === 'error' && (
          <span className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            {t('sm_manuals_save_error')}
          </span>
        )}
      </div>
    </div>
  );
};
