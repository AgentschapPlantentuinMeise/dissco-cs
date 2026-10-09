import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statsQueries } from '../api/queries/stats';
import { HonourBoardPeriodKey } from '@dissco-cs/shared-types';
import { usePollingWindow } from './use-polling-window';

// One independent query per period instead of one bundled call, so each period can render as
// soon as its own data resolves instead of all 4 waiting on the slowest (legend, unfiltered).
// Per-period pattern otherwise unchanged: one triggering fetch on page load (starts a background
// recompute if the cache is stale) plus a separate, side-effect-free poll every 15s for 2 minutes
// after mount, then stopping -- that only reads whatever the cache currently holds and must never
// cause a recompute, so it hits a different, pure-read endpoint. refetchOnWindowFocus is off on
// the triggering query so tab-switching doesn't also trigger SQL.
// Without a slug the board covers the whole site; with one it's scoped to that institution.
function usePeriod(slug: string | undefined, enabled: boolean, period: HonourBoardPeriodKey, refetchInterval: number | false) {
  const initial = useQuery({ ...statsQueries.honourBoard(period, slug), enabled, refetchOnWindowFocus: false });
  useEffect(() => {
    if (initial.error) console.error('[honour-board] initial fetch failed', slug, period, initial.error);
  }, [initial.error, slug, period]);

  const peek = useQuery({ ...statsQueries.honourBoardCurrent(period, slug), enabled, refetchInterval });
  useEffect(() => {
    if (peek.error) console.error('[honour-board] peek fetch failed', slug, period, peek.error);
  }, [peek.error, slug, period]);

  return { ...initial, data: peek.data ?? initial.data };
}

export function useHonourBoardPeriods(slug: string | undefined, enabled: boolean) {
  const refetchInterval = usePollingWindow();

  return {
    today: usePeriod(slug, enabled, 'today', refetchInterval),
    week: usePeriod(slug, enabled, 'week', refetchInterval),
    month: usePeriod(slug, enabled, 'month', refetchInterval),
    legend: usePeriod(slug, enabled, 'legend', refetchInterval),
  };
}
