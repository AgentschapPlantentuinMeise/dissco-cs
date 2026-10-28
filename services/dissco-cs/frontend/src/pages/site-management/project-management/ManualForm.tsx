import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { manualQueries } from '../../../api/queries/manuals';
import {
  MANUAL_ATTACHMENT_MIME_TYPES,
  MAX_MANUAL_TITLE_LENGTH,
  MultilingualText,
  SITE_PAGE_LANGS,
  SitePageLang,
  attachmentLangsAfterSave,
  checkManualContent,
  manualInputSchema,
} from '@dissco-cs/shared-types';
import { reportActionError } from '../../../api/error-toast';
import { SaveButton } from '../../../components/ui/SaveButton';
import { CancelButton } from '../../../components/ui/CancelButton';
import { Button } from '../../../components/ui/Button';
import { DeleteIconButton } from '../../../components/ui/DeleteIconButton';
import { MarkdownToolbar } from '../../../components/ui/MarkdownToolbar';
import { LanguageTabs } from '../../../components/ui/LanguageTabs';
import { inputClass } from '../../../components/ui/input-styles';
import { AttachmentFileError, attachmentFileError } from './manual-content';

export type ManualDraft = {
  title: MultilingualText;
  content: MultilingualText;
  // Attachments picked in this form, sent only on Save: a file adds or replaces the one of that
  // language, null removes the stored one.
  picked: Partial<Record<SitePageLang, File | null>>;
};

export const EMPTY_MANUAL_DRAFT: ManualDraft = { title: {}, content: {}, picked: {} };

// The side form of the manual library: title, text and attachment per language. Nothing reaches
// the server before Save, so a new manual and an edited one work the same way.
export function ManualForm({ manualId, storedLangs, draft, setDraft, selectedLang, onSelectLang, saving, onSave, onCancel }: {
  // null for a new manual.
  manualId: number | null;
  // Languages that have an attachment on the server.
  storedLangs: SitePageLang[];
  draft: ManualDraft;
  setDraft: React.Dispatch<React.SetStateAction<ManualDraft>>;
  selectedLang: SitePageLang;
  onSelectLang: (lang: SitePageLang) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('dissco-cs');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Only for the name and size of a stored attachment.
  const { data: detail } = useQuery({ ...manualQueries.detail(manualId ?? 0), enabled: manualId !== null });

  const contentCheck = checkManualContent(draft.content, attachmentLangsAfterSave(storedLangs, draft.picked));
  const missingLangs = SITE_PAGE_LANGS.filter(
    lang => !(draft.title[lang] ?? '').trim() || contentCheck.missingLangs.includes(lang)
  );
  const canSave =
    manualInputSchema.safeParse({ title: draft.title, content: draft.content }).success &&
    contentCheck.hasContent &&
    missingLangs.length === 0;

  const setText = (field: 'title' | 'content', value: string) =>
    setDraft(prev => ({ ...prev, [field]: { ...prev[field], [selectedLang]: value } }));

  // Per language, so switching tabs does not show one language's error on another.
  const [attachmentError, setAttachmentError] = useState<{ lang: SitePageLang; key: AttachmentFileError } | null>(null);

  const pick = async (file: File) => {
    const lang = selectedLang;
    const error = await attachmentFileError(file);
    setAttachmentError(error ? { lang, key: error } : null);
    if (!error) {
      setDraft(prev => ({ ...prev, picked: { ...prev.picked, [lang]: file } }));
    }
  };

  const removeAttachment = () =>
    setDraft(prev => {
      const picked = { ...prev.picked };
      if (storedLangs.includes(selectedLang)) {
        picked[selectedLang] = null;
      } else {
        delete picked[selectedLang];
      }
      return { ...prev, picked };
    });

  // Inserts {{attachment}} at the cursor: ManualModal shows the attachment gallery exactly there,
  // instead of after all sections.
  const insertAttachmentMarker = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const current = draft.content[selectedLang] ?? '';
    const marker = '\n\n{{attachment}}\n\n';
    setText('content', current.slice(0, start) + marker + current.slice(textarea.selectionEnd));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + marker.length, start + marker.length);
    });
  };

  const pickedFile = draft.picked[selectedLang];
  const stored = selectedLang in draft.picked ? undefined : detail?.attachments[selectedLang];
  const hasStored = !(selectedLang in draft.picked) && storedLangs.includes(selectedLang);
  const attachment = pickedFile ?? stored;

  return (
    <div>
      <LanguageTabs selected={selectedLang} onSelect={onSelectLang} isMissing={lang => missingLangs.includes(lang)} />

      <label className="flex flex-col gap-1 mb-4">
        <span className="text-sm font-medium text-gray-700">{t('sm_manuals_field_title')} *</span>
        <input
          type="text"
          value={draft.title[selectedLang] ?? ''}
          onChange={e => setText('title', e.target.value)}
          maxLength={MAX_MANUAL_TITLE_LENGTH}
          className={inputClass}
        />
      </label>

      <MarkdownToolbar textareaRef={textareaRef} value={draft.content[selectedLang] ?? ''} onChange={next => setText('content', next)} />
      <textarea
        ref={textareaRef}
        value={draft.content[selectedLang] ?? ''}
        onChange={e => setText('content', e.target.value)}
        placeholder={t('sm_manuals_content_placeholder')}
        className={`${inputClass} w-full min-h-[220px] rounded-t-none font-mono`}
      />
      <p className="text-xs text-gray-500 mt-1.5">{t('sm_manuals_heading_hint')}</p>
      <p className="text-xs text-gray-500 mt-0.5">{t('sm_manuals_attachment_marker_hint')}</p>

      <div className="flex items-center justify-between gap-3 mt-4 px-3.5 py-2.5 bg-gray-50 rounded text-sm">
        {attachment || hasStored ? (
          <>
            <span className="truncate">
              {attachment ? `${pickedFile ? pickedFile.name : stored?.filename} · ${(attachment.size / 1_000_000).toFixed(1)} MB` : ''}
            </span>
            <span className="flex items-center gap-2 flex-shrink-0">
              <Button variant="secondary" size="sm" onClick={insertAttachmentMarker}>
                {t('sm_manuals_attachment_insert_marker')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                {t('sm_manuals_attachment_replace')}
              </Button>
              <DeleteIconButton onClick={removeAttachment} />
            </span>
          </>
        ) : (
          <>
            <span className="text-gray-500">{t('sm_manuals_attachment_none')}</span>
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              {t('sm_manuals_attachment_add')}
            </Button>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={MANUAL_ATTACHMENT_MIME_TYPES.join(',')}
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) pick(file).catch(err => reportActionError(err, 'error_upload_failed'));
            e.target.value = '';
          }}
        />
      </div>
      {attachmentError?.lang === selectedLang && <p className="text-xs text-red-600 mt-1.5 mb-0">{t(attachmentError.key)}</p>}

      {missingLangs.length > 0 && (
        <p className="text-xs text-red-600 mt-3 mb-0">
          {t('sm_manuals_missing_langs', { langs: missingLangs.map(lang => t(`lang_${lang}`)).join(', ') })}
        </p>
      )}
      {!contentCheck.hasContent && <p className="text-xs text-red-600 mt-1 mb-0">{t('sm_manuals_needs_content')}</p>}

      <div className="flex items-center gap-3 mt-4">
        <SaveButton onClick={onSave} disabled={!canSave} loading={saving} />
        <CancelButton onClick={onCancel} />
      </div>
    </div>
  );
}
