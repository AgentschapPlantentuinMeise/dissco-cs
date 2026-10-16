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
  const items = [...first.items];
  const groupSize = Math.max(1, concurrency);

  for (let start = 2; start <= totalPages; start += groupSize) {
    const pages = [];
    for (let page = start; page < start + groupSize && page <= totalPages; page++) {
      pages.push(page);
    }
    const results = await Promise.all(pages.map(fetchPage));
    for (const result of results) {
      items.push(...result.items);
    }
  }

  return items;
}
