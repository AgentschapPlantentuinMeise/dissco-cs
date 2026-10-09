import React, { useRef } from 'react';
import ReactMarkdown from 'react-markdown';

type CsMarkdownProps = {
  content: string;
};

// First paragraph renders as a larger "intro" lead-in; every paragraph after that
// uses the normal body style. Keeps all CMS-driven pages (about/help/contact/institutions)
// visually consistent regardless of how much text an admin writes.
export const CsMarkdown: React.FC<CsMarkdownProps> = ({ content }) => {
  const introRendered = useRef(false);
  introRendered.current = false;

  return (
    <ReactMarkdown
      components={{
        h1: ({ node, ...props }) => <h1 className="text-3xl text-[var(--cs-primary)] mb-4" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-2xl text-[var(--cs-primary)] mb-4" {...props} />,
        h3: ({ node, ...props }) => <h3 className="text-xl text-[var(--cs-primary)] mb-3" {...props} />,
        p: ({ node, ...props }) => {
          if (!introRendered.current) {
            introRendered.current = true;
            return <p className="text-lg leading-relaxed text-gray-600 mb-6" {...props} />;
          }
          return <p className="text-base leading-relaxed text-gray-800 mb-5 last:mb-0" {...props} />;
        },
        hr: ({ node, ...props }) => <hr className="my-8" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-5 text-base leading-relaxed text-gray-800" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-5 text-base leading-relaxed text-gray-800" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
