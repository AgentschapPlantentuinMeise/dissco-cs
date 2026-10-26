import React from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { AnnouncementDto } from '@dissco-cs/shared-types';
import { siteLangText } from '../../utility/site-lang-text';

// Compact overrides so the markdown fits the small text of the strip and the megaphone's list, instead
// of CsMarkdown's full-page heading and paragraph sizes.
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="m-0">{children}</p>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-cs-primary underline">
      {children}
    </a>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="m-0 list-disc pl-5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="m-0 list-decimal pl-5">{children}</ol>,
};

/** An announcement's title and text in the site language. */
export function AnnouncementText({ announcement, inline = false }: { announcement: AnnouncementDto; inline?: boolean }) {
  const { i18n } = useTranslation('dissco-cs');
  return (
    <div className={inline ? 'flex flex-wrap items-baseline gap-x-3 min-w-0' : 'min-w-0'}>
      <span className="font-semibold">{siteLangText(announcement.title, i18n.language, '')}</span>
      <div className={inline ? 'min-w-0' : 'text-gray-600 mt-0.5'}>
        <ReactMarkdown components={markdownComponents}>{siteLangText(announcement.description, i18n.language, '')}</ReactMarkdown>
      </div>
    </div>
  );
}
