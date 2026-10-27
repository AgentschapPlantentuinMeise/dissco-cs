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
