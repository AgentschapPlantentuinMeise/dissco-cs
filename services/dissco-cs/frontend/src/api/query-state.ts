/**
 * Whether a query failed at least once and never had data. Unlike the query's own isError, this
 * stays true while TanStack retries it (a remount or a window focus): a failed query without data
 * goes back to pending then. A screen that must not show defaults in place of real data checks this.
 * @param query the result of useQuery (its data and errorUpdateCount)
 * Returns: true until a load succeeds.
 */
export function failedToLoad(query: { data: unknown; errorUpdateCount: number }): boolean {
  return query.data === undefined && query.errorUpdateCount > 0;
}

export type LoadState = 'loading' | 'failed' | 'ready';

/**
 * What a part of a page shows for the queries it needs: an error as soon as one of them failed to
 * load, "loading" while one has no data yet, and the content once all have data. A query that already
 * had data keeps showing it when a later refetch fails.
 * @param queries the results of useQuery; leave out a query that is disabled (enabled: false), since it
 * never gets data and would keep the part loading.
 * Returns: 'failed', 'loading' or 'ready'.
 */
export function loadState(...queries: { data: unknown; errorUpdateCount: number }[]): LoadState {
  if (queries.some(failedToLoad)) return 'failed';
  return queries.every(query => query.data !== undefined) ? 'ready' : 'loading';
}
