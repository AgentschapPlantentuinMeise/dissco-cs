import React from 'react';
import { toEmbedUrl } from './manual-sections';

// How ReactMarkdown renders a manual: site styling, and YouTube/Vimeo links as an embedded video.
export const markdownComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    const embedUrl = href ? toEmbedUrl(href) : null;
    if (embedUrl) {
      return (
        <span className="my-3 block aspect-video overflow-hidden rounded-lg">
          <iframe
            src={embedUrl}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={typeof children === 'string' ? children : 'video'}
          />
        </span>
      );
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-cs-primary underline">
        {children}
      </a>
    );
  },
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mb-2 mt-0 text-base font-semibold text-cs-primary">{children}</h4>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h5 className="mb-2 mt-3 text-sm font-semibold text-cs-primary">{children}</h5>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 text-[0.87rem] leading-relaxed text-gray-700 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 list-disc pl-5 text-[0.87rem] leading-relaxed text-gray-700">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 list-decimal pl-5 text-[0.87rem] leading-relaxed text-gray-700">{children}</ol>
  ),
};
