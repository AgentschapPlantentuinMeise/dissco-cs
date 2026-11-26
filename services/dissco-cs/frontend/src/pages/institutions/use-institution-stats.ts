import { useQuery } from '@tanstack/react-query';
import { statsQueries } from '../../api/queries/stats';
import { useRefreshPoll } from '../../hooks/use-refresh-poll';

// One fetch on page load (starts a background recalculation when the cache is stale), plus a
// cache-only poll while that recalculation runs. The poll goes to a different, pure-read endpoint,
// so it can never start a recalculation itself.
export function useInstitutionStats(slug: string | undefined) {
  const initial = useQuery(statsQueries.institution(slug));
  const peek = useQuery({ ...statsQueries.institutionCurrent(slug), ...useRefreshPoll(initial.data?.refreshing) });

  return { ...initial, data: peek.data ?? initial.data };
}
