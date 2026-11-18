import React from 'react';

// Takes the place of a list or part of a page that loaded but has nothing to show. The text stays
// per place ("nothing saved yet" says something else than "nothing for this filter"); the look is
// the same as LoadingText, so a section does not jump between loading and empty. Compact for narrow
// places such as the side panels on the annotate page.
export function EmptyText({ compact = false, children }: { compact?: boolean; children: React.ReactNode }) {
  return <p className={compact ? 'm-0 text-gray-500' : 'py-8 text-center text-gray-500 m-0'}>{children}</p>;
}
