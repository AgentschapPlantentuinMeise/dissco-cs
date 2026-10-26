import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { ManualDetailDto } from '@dissco-cs/shared-types';
import { Disclosure } from '../ui/Disclosure';
import { projectsApi } from '../../api/cs-client/projects';
import { siteLangText } from '../../utility/site-lang-text';
import { ATTACHMENT_MARKER, attachmentLang, splitBodyAroundMarker, splitIntoSections } from './manual-sections';
import { markdownComponents } from './markdown-components';
import { PdfGallery } from './PdfGallery';

// A project's manual: its text in sections (one per "##" heading, to open and close) and its
// attachment, where the text puts {{attachment}} or else after the last section.
export function ManualContent({ manual, projectSlug }: { manual: ManualDetailDto; projectSlug: string }) {
  const { t, i18n } = useTranslation('dissco-cs');

  const content = siteLangText(manual.content, i18n.language, '');
  const sections = useMemo(() => splitIntoSections(content), [content]);

  const lang = attachmentLang(manual, i18n.language);
  const attachment = manual.attachments?.[lang];
  const attachmentUrl = attachment ? projectsApi.manualAttachmentUrl(projectSlug, lang) : null;
  const isPdf = attachment?.mimeType === 'application/pdf';

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

  const markerUsed = attachmentNode !== null && content.includes(ATTACHMENT_MARKER);

  if (sections.length === 0 && !attachmentNode) {
    return <p className="text-sm text-gray-500">{t('manual_modal_empty')}</p>;
  }

  return (
    <>
      {sections.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {sections.map((section, index) => {
            const body =
              attachmentNode && section.body.includes(ATTACHMENT_MARKER) ? (
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
              );
            // A section without heading (the intro before the first "##") has no header to open it
            // again, so it is never closed.
            return section.heading ? (
              <Disclosure key={index} title={section.heading} defaultOpen={index === 0 || sections.length === 1}>
                {body}
              </Disclosure>
            ) : (
              <div key={index} className="border border-gray-200 rounded px-3.5 py-4">
                {body}
              </div>
            );
          })}
        </div>
      )}

      {attachmentNode && !markerUsed && attachmentNode}
    </>
  );
}
