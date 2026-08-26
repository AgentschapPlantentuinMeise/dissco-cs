import { useQuery } from 'react-query';
import { institutionsApi } from '../api/cs-api';
import { usePollingWindow } from './use-polling-window';

// One triggering fetch on page load (starts a background recompute if the cache is stale) plus
// a separate, side-effect-free poll every 15s for 2 minutes after mount, then stopping -- that
// only reads whatever the cache currently holds and must never cause a recompute, so it hits a
// different, pure-read endpoint. refetchOnWindowFocus is off on the triggering query so
// tab-switching doesn't also trigger SQL.
export function useInstitutionStats(slug: string | undefined) {
  const initial = useQuery(['institution-stats', slug], () => institutionsApi.getStats(slug!), {
    enabled: !!slug,
    refetchOnWindowFocus: false,
  });
  const refetchInterval = usePollingWindow();
  const peek = useQuery(['institution-stats-current', slug], () => institutionsApi.getStatsCurrent(slug!), {
    enabled: !!slug,
    refetchInterval,
  });

  return { ...initial, data: peek.data ?? initial.data };
}
