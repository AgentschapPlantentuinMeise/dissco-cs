import { useQuery } from 'react-query';
import { statsApi } from '../api/cs-api';
import { usePollingWindow } from './use-polling-window';

// One triggering fetch on page load (starts a background recompute if the cache is stale) plus
// a separate, side-effect-free poll every 15s for 2 minutes after mount, then stopping -- that
// only reads whatever the cache currently holds and must never cause a recompute, so it hits a
// different, pure-read endpoint. refetchOnWindowFocus is off on the triggering query so
// tab-switching doesn't also trigger SQL.
export function useSiteStats() {
  const initial = useQuery('site-stats', () => statsApi.get(), { refetchOnWindowFocus: false });
  const refetchInterval = usePollingWindow();
  const peek = useQuery('site-stats-current', () => statsApi.getCurrent(), { refetchInterval });

  return { ...initial, data: peek.data ?? initial.data };
}
