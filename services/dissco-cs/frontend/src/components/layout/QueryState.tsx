import React from 'react';
import { loadState } from '../../api/query-state';
import { LoadingText } from './LoadingText';
import { SectionLoadError } from './SectionLoadError';

// One part of a page that needs one query: "loading", the load error, or the content with its data.
// A part that needs several queries uses loadState with LoadingText and SectionLoadError itself.
export function QueryState<T>({ query, children }: {
  query: { data: T | undefined; errorUpdateCount: number };
  children: (data: T) => React.ReactNode;
}) {
  const state = loadState(query);
  if (state === 'failed') return <SectionLoadError />;
  if (state === 'loading' || query.data === undefined) return <LoadingText />;
  return <>{children(query.data)}</>;
}
