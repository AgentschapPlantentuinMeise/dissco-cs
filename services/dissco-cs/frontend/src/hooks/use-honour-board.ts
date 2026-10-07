import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/cs-client/stats';
import { HonourBoardPeriodKey } from '@dissco-cs/shared-types';
import { usePollingWindow } from './use-polling-window';

// One independent query per period instead of one bundled call, so each period can render as
// soon as its own data resolves instead of all 4 waiting on the slowest (legend, unfiltered).
// Per-period pattern otherwise unchanged: one triggering fetch on page load (starts a background
// recompute if the cache is stale) plus a separate, side-effect-free poll every 15s for 2 minutes
// after mount, then stopping -- that only reads whatever the cache currently holds and must never
// cause a recompute, so it hits a different, pure-read endpoint. refetchOnWindowFocus is off on
// the triggering query so tab-switching doesn't also trigger SQL.
function usePeriod(period: HonourBoardPeriodKey, refetchInterval: number | false) {
  const initial = useQuery({
    queryKey: ['honour-board', period],
    queryFn: () => statsApi.getHonourBoard(period),
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (initial.error) console.error('[honour-board] initial fetch failed', period, initial.error);
  }, [initial.error]);

  const peek = useQuery({
    queryKey: ['honour-board-current', period],
    queryFn: () => statsApi.getHonourBoardCurrent(period),
    refetchInterval,
  });
  useEffect(() => {
    if (peek.error) console.error('[honour-board] peek fetch failed', period, peek.error);
  }, [peek.error]);

  return { ...initial, data: peek.data ?? initial.data };
}

export function useHonourBoard() {
  const refetchInterval = usePollingWindow();

  return {
    today: usePeriod('today', refetchInterval),
    week: usePeriod('week', refetchInterval),
    month: usePeriod('month', refetchInterval),
    legend: usePeriod('legend', refetchInterval),
  };
}
