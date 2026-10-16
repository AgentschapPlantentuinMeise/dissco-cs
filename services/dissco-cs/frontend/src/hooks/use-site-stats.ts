import { useQuery } from '@tanstack/react-query';
import { statsQueries } from '../api/queries/stats';
import { usePollingWindow } from './use-polling-window';

// The site counters: one normal fetch when the page opens (the backend answers from its cache and
// recalculates in the background), plus a cache-only poll every 15 s during the first 2 minutes,
// which never starts a recalculation. refetchOnWindowFocus is off on the normal fetch, so
// switching browser tabs does not start database queries.
export function useSiteStats() {
  const initial = useQuery({ ...statsQueries.site(), refetchOnWindowFocus: false });
  const refetchInterval = usePollingWindow();
  const peek = useQuery({ ...statsQueries.siteCurrent(), refetchInterval });

  return { ...initial, data: peek.data ?? initial.data };
}
