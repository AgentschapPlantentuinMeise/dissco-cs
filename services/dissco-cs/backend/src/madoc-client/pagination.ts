export interface Page<T> {
  items: T[];
  totalPages?: number;
}

/**
 * Fetches every page of a paged Madoc list: page 1 first (to learn totalPages), then the other
 * pages in groups of at most `concurrency` requests at the same time. Every page is fetched;
 * `concurrency` only limits how many run at once.
 * @param fetchPage fetches one page (from 1) and returns its items and, at least for page 1,
 *   totalPages
 * @param concurrency how many pages may be requested at the same time (default 1: one by one)
 * Returns: the items of all pages, in page order.
 */
export async function collectAllPages<T>(
  fetchPage: (page: number) => Promise<Page<T>>,
  concurrency = 1
): Promise<T[]> {
  const first = await fetchPage(1);
  const totalPages = first.totalPages ?? 1;
  const otherPages = Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => index + 2);
  const results = await mapInGroups(otherPages, concurrency, fetchPage);

  return [...first.items, ...results.flatMap(result => result.items)];
}

/**
 * Runs `fn` for every item, at most `groupSize` at the same time: one group, then the next.
 * @param items the inputs, e.g. page numbers or task ids
 * @param groupSize how many may run at once (at least 1)
 * @param fn the call per item
 * Returns: the results in the order of `items`. Rejects with the first error, after its group ended.
 */
export async function mapInGroups<T, R>(items: T[], groupSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const size = Math.max(1, groupSize);
  const results: R[] = [];
  for (let start = 0; start < items.length; start += size) {
    results.push(...(await Promise.all(items.slice(start, start + size).map(fn))));
  }
  return results;
}
