import React from 'react';

// The content below a plain PageHeader (login, review, site management): one container, no
// sections. Public and working pages use PageSection instead.
export function PageBody({ width = 'wide', children }: { width?: 'wide' | 'narrow'; children: React.ReactNode }) {
  return (
    <div className={`cs-container pt-10 pb-16 ${width === 'wide' ? 'cs-container--wide' : 'max-w-md'}`}>{children}</div>
  );
}
