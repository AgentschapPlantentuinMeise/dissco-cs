import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { manualKeys, manualQueries } from '../../../api/queries/manuals';
import { projectKeys } from '../../../api/queries/projects';
import { manualsApi } from '../../../api/cs-client/manuals';
import { MAX_MANUAL_ATTACHMENT_LENGTH, SitePageLang } from '@dissco-cs/shared-types';
import { SaveButton } from '../../../components/ui/SaveButton';
import { DeleteIconButton } from '../../../components/ui/DeleteIconButton';
import { MarkdownToolbar } from '../../../components/ui/MarkdownToolbar';
import { LuCheck } from 'react-icons/lu';
import { LANGUAGES, defaultLang } from '../../../utility/site-lang-text';
import { LanguageTabs } from '../../../components/ui/LanguageTabs';

// The editor of a manual's content: language tabs, markdown toolbar and text, attachment. Used in
// the per-project panel and in the manual library, so editing works the same everywhere.
export const ManualContentEditor: React.FC<{ manualId: number }> = ({ manualId }) => {
  const { t, i18n } = useTranslation('dissco-cs');
  const queryClient = useQueryClient();
  const { data: manual } = useQuery(manualQueries.detail(manualId));
  const [selectedLang, setSelectedLang] = useState<SitePageLang>(defaultLang(i18n.language));
  const [draftContent, setDraftContent] = useState<Partial<Record<SitePageLang, string>>>({});
  const [attachmentSaved, setAttachmentSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // This manual's own detail, plus the public manual popup, which reads its own cached query
  // (projectQueries.manual) and would otherwise only update after its staleTime (5 min).
  const onWritten = () => {
    queryClient.invalidateQueries({ queryKey: projectKeys.manuals() });
    return queryClient.invalidateQueries({ queryKey: manualKeys.detail(manualId) });
  };

  const {
    mutate: saveContent,
    isPending: saving,
    isSuccess: saved,
    reset: resetSave,
  } = useMutation({
    mutationFn: (content: Partial<Record<SitePageLang, string>>) =>
      Promise.all(LANGUAGES.map(lang => manualsApi.setContent(manualId, lang.code, content[lang.code] ?? ''))),
    onSuccess: onWritten,
  });

  const { mutate: uploadAttachment, isPending: uploading } = useMutation({
    mutationFn: ({ lang, file }: { lang: SitePageLang; file: File }) => manualsApi.uploadAttachment(manualId, lang, file),
    onSuccess: () => {
      setAttachmentSaved(true);
      return onWritten();
    },
    meta: { errorMessage: 'error_upload_failed' },
  });

  const { mutate: deleteAttachment } = useMutation({
    mutationFn: (lang: SitePageLang) => manualsApi.deleteAttachment(manualId, lang),
    onSuccess: () => {
      setAttachmentSaved(false);
      return onWritten();
    },
    meta: { errorMessage: 'error_delete_failed' },
  });

  useEffect(() => {
    if (manual) {
      setDraftContent(manual.content ?? {});
      resetSave();
    }
    // Only re-initialise when the manual itself changes -- not on manual.updatedAt, which also
    // changes after our own successful save (via the refetch) and would otherwise reset the
    // 'saved' status straight back to idle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manual?.id]);

  if (!manual) {
    return <p className="text-sm text-gray-500">{t('sm_manuals_loading')}</p>;
  }

  const attachment = manual.attachments[selectedLang];
  // A language counts as filled in when it has text OR an attachment, so a mix (text in one
  // language, an attachment in another) is fine. Saving is only possible once no language is empty.
  const langHasContent = (lang: (typeof LANGUAGES)[number]) =>
    !!(draftContent[lang.code] ?? '').trim() || !!manual.attachments[lang.code];
  const hasAnyContent = LANGUAGES.some(langHasContent);
  const missingLangs = hasAnyContent ? LANGUAGES.filter(lang => !langHasContent(lang)) : [];
  const canSave = hasAnyContent && missingLangs.length === 0;

  const save = () => {
    if (!canSave) return;
    saveContent(draftContent);
  };

  const onPickFile = (file: File) => {
    if (file.size > MAX_MANUAL_ATTACHMENT_LENGTH) {
      window.alert(t('sm_manuals_attachment_too_large'));
      return;
    }
    setAttachmentSaved(false);
    uploadAttachment({ lang: selectedLang, file });
  };

  const removeAttachment = () => deleteAttachment(selectedLang);

  // Inserts {{attachment}} at the cursor: ManualModal shows the attachment gallery exactly there,
  // instead of after all sections.
  const insertAttachmentMarker = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = draftContent[selectedLang] ?? '';
    const marker = '\n\n{{attachment}}\n\n';
    const next = current.slice(0, start) + marker + current.slice(end);
    setDraftContent(prev => ({ ...prev, [selectedLang]: next }));
    resetSave();
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + marker.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  return (
    <div>
      <LanguageTabs
        selected={selectedLang}
        onSelect={lang => {
          setSelectedLang(lang);
          setAttachmentSaved(false);
        }}
        isMissing={lang => missingLangs.some(missing => missing.code === lang)}
      />

      <MarkdownToolbar
        textareaRef={textareaRef}
        value={draftContent[selectedLang] ?? ''}
        onChange={next => {
          setDraftContent(prev => ({ ...prev, [selectedLang]: next }));
          resetSave();
        }}
      />
      <textarea
        ref={textareaRef}
        value={draftContent[selectedLang] ?? ''}
        onChange={e => {
          setDraftContent(prev => ({ ...prev, [selectedLang]: e.target.value }));
          resetSave();
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
              <DeleteIconButton onClick={removeAttachment} />
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
              onPickFile(file);
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
        <SaveButton onClick={save} disabled={!canSave} loading={saving} />
        {saved && (
          <span className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            <LuCheck aria-hidden="true" /> {t('common_saved')}
          </span>
        )}
      </div>
    </div>
  );
};
