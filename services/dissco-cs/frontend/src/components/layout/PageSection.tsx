import React from 'react';
import { buttonClass } from '../ui/Button';
import { HrefLink } from '../../utility/href-link';

// One full-width band of a page below its PageHeader (style guide: "secties, geen dozen").
// Sections alternate between the page colour, white and light teal; the content starts on the
// same line as the header's text.
export type PageSectionTone = 'page' | 'white' | 'tint';

const TONES: Record<PageSectionTone, string> = {
  page: '',
  white: 'bg-white',
  tint: 'bg-cs-primary/[0.07] border-t-[3px] border-cs-primary',
};

export function PageSection({ title, intro, action, tone = 'page', children }: {
  title?: React.ReactNode;
  intro?: React.ReactNode;
  // A link right of the title, e.g. "All projects". Always drawn the same way (a small secondary
  // button), so every section's action looks alike.
  action?: { href: string; label: string };
  tone?: PageSectionTone;
  // Optional: a call to action can be just a title, an intro and the action.
  children?: React.ReactNode;
}) {
  return (
    <section className={`py-[52px] ${TONES[tone]}`}>
      <div className="cs-container cs-container--wide flex flex-col gap-6">
        {(title || action) && (
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              {title && <h2 className="text-[1.6rem] font-medium text-gray-900 m-0">{title}</h2>}
              {intro && <p className="text-gray-600 mt-1.5 mb-0 max-w-[64ch]">{intro}</p>}
            </div>
            {action && (
              <HrefLink href={action.href} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                {action.label}
              </HrefLink>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
