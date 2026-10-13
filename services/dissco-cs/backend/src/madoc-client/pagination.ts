export interface Page<T> {
  items: T[];
  totalPages?: number;
}

// Walks every page of a paginated Madoc list: page 1 first (to learn totalPages), then pages
// 2..totalPages in groups of at most `concurrency` concurrent requests. Every page is fetched;
// `concurrency` only caps how many are in flight at once. Results keep page order.
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
