import { useQuery } from '@tanstack/react-query';
import { statsQueries } from '../api/queries/stats';
import { useRefreshPoll } from './use-refresh-poll';

// The site counters: one normal fetch when the page opens (the backend answers from its cache and
// recalculates in the background), plus a cache-only poll while that recalculation runs, which
// never starts a recalculation itself.
export function useSiteStats() {
  const initial = useQuery(statsQueries.site());
  const peek = useQuery({ ...statsQueries.siteCurrent(), ...useRefreshPoll(initial.data?.refreshing) });

  return { ...initial, data: peek.data ?? initial.data };
}
