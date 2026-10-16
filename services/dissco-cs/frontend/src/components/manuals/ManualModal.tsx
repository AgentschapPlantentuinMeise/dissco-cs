import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { projectQueries } from '../../api/queries/projects';
import ReactMarkdown from 'react-markdown';
import { Modal } from '../ui/Modal';
import { LuChevronDown } from 'react-icons/lu';
import { projectsApi } from '../../api/cs-client/projects';
import { SitePageLang } from '@dissco-cs/shared-types';
import { siteLangText } from '../../utility/site-lang-text';
import { ATTACHMENT_MARKER, splitBodyAroundMarker, splitIntoSections } from './manual-sections';
import { markdownComponents } from './markdown-components';
import { PdfGallery } from './PdfGallery';

type ManualModalProps = {
  projectSlug: string;
  projectLabel?: string;
  open: boolean;
  onClose: () => void;
  onShown?: () => void;
};

export function ManualModal({
  projectSlug,
  projectLabel,
  open,
  onClose,
  onShown,
}: ManualModalProps) {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data: manual } = useQuery({
    ...projectQueries.manual(projectSlug),
    enabled: open && !!projectSlug,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const [openSectionIndex, setOpenSectionIndex] = useState(0);
  const shownRef = useRef(false);

  useEffect(() => {
    if (open && manual && !shownRef.current) {
      shownRef.current = true;
      onShown?.();
    }
    if (!open) {
      shownRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, manual]);

  const content = siteLangText(manual?.content, i18n.language, '');
  const sections = useMemo(() => splitIntoSections(content), [content]);

  const lang = (manual?.attachments?.[i18n.language as SitePageLang] ? i18n.language : 'nl') as SitePageLang;
  const attachment = manual?.attachments?.[lang];
  const attachmentUrl = attachment ? projectsApi.manualAttachmentUrl(projectSlug, lang) : null;
  const isPdf = attachment?.mimeType === 'application/pdf';

  // No text, only a PDF: the modal would add nothing, so the gallery opens right away.
  const directToGallery = isPdf && attachmentUrl !== null && content.trim().length === 0;

  const attachmentNode =
    attachment && attachmentUrl ? (
      isPdf ? (
        <PdfGallery url={attachmentUrl} filename={attachment.filename} />
      ) : (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700">
          <span>{attachment.filename}</span>
          <a href={attachmentUrl} download={attachment.filename} className="font-semibold text-cs-primary hover:underline">
            {t('manual_pdf_download_original')}
          </a>
        </div>
      )
    ) : null;

  // An admin can put {{attachment}} in a section to show the attachment exactly there; without it
  // the attachment comes after all sections.
  const markerUsed = attachmentNode !== null && content.includes(ATTACHMENT_MARKER);

  if (!open || !manual) {
    return null;
  }

  // Only a PDF, no text: the modal (title and an empty-sections message) adds nothing, so open the
  // gallery on page 1 right away.
  if (directToGallery) {
    return attachment && attachmentUrl ? (
      <PdfGallery url={attachmentUrl} filename={attachment.filename} openDirectly onClose={onClose} />
    ) : null;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={t('manual_modal_eyebrow')}
      title={projectLabel || siteLangText(manual.title, i18n.language, '')}
      size="lg"
    >
      {sections.length === 0 ? (
        <p className="text-sm text-gray-500">{t('manual_modal_empty')}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sections.map((section, index) => {
            // A section without heading (the intro before the first "##") has no header to open it
            // again, so it always stays open.
            const isOpen = section.heading === null || sections.length === 1 || openSectionIndex === index;
            return (
              <div key={index} className="overflow-hidden rounded-lg border border-gray-200">
                {section.heading && (
                  <button
                    type="button"
                    onClick={() => setOpenSectionIndex(isOpen ? -1 : index)}
                    className={`flex w-full items-center justify-between gap-2 border-none px-3.5 py-2.5 text-left text-sm font-semibold cursor-pointer ${
                      isOpen ? 'bg-cs-primary text-white' : 'bg-gray-50 text-gray-800'
                    }`}
                  >
                    <span>{section.heading}</span>
                    <LuChevronDown className={`flex-shrink-0 transition-transform ${isOpen ? '-rotate-180' : ''}`} />
                  </button>
                )}
                {isOpen && (
                  <div className="px-4 py-3.5">
                    {attachmentNode && section.body.includes(ATTACHMENT_MARKER) ? (
                      (() => {
                        const [before, after] = splitBodyAroundMarker(section.body);
                        return (
                          <>
                            {before.trim() && <ReactMarkdown components={markdownComponents}>{before}</ReactMarkdown>}
                            {attachmentNode}
                            {after.trim() && <ReactMarkdown components={markdownComponents}>{after}</ReactMarkdown>}
                          </>
                        );
                      })()
                    ) : (
                      <ReactMarkdown components={markdownComponents}>{section.body}</ReactMarkdown>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {attachmentNode && !markerUsed && attachmentNode}
    </Modal>
  );
}
