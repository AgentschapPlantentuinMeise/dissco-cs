import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/cs-client/stats';
import { usePollingWindow } from './use-polling-window';

// One triggering fetch on page load (starts a background recompute if the cache is stale) plus
// a separate, side-effect-free poll every 15s for 2 minutes after mount, then stopping -- that
// only reads whatever the cache currently holds and must never cause a recompute, so it hits a
// different, pure-read endpoint. refetchOnWindowFocus is off on the triggering query so
// tab-switching doesn't also trigger SQL.
export function useInstitutionStats(slug: string | undefined) {
  const initial = useQuery({
    queryKey: ['institution-stats', slug],
    queryFn: () => statsApi.get(slug!),
    enabled: !!slug,
    refetchOnWindowFocus: false,
  });
  const refetchInterval = usePollingWindow();
  const peek = useQuery({
    queryKey: ['institution-stats-current', slug],
    queryFn: () => statsApi.getCurrent(slug!),
    enabled: !!slug,
    refetchInterval,
  });

  return { ...initial, data: peek.data ?? initial.data };
}
