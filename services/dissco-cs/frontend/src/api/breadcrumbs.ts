import type { Breadcrumb } from '@dissco-cs/shared-types';

const MAX_BREADCRUMBS = 10;
const trail: Breadcrumb[] = [];

// Paths only: a query string can hold search terms or tokens we have no business storing.
export function withoutQuery(path: string): string {
  return path.split(/[?#]/)[0];
}

// The last few things that happened in this tab (page changes, API calls), kept in memory only and
// sent along with an error report -- so a stored error shows what led up to it. Never any content.
export function addBreadcrumb(type: Breadcrumb['type'], text: string, at: Date = new Date()): void {
  trail.push({ at: at.toISOString(), type, text: text.slice(0, 200) });
  if (trail.length > MAX_BREADCRUMBS) {
    trail.shift();
  }
}

export function getBreadcrumbs(): Breadcrumb[] {
  return [...trail];
}
