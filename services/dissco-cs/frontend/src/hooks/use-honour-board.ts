import { useQuery } from 'react-query';
import { honourBoardApi, HonourBoardPeriodKey } from '../api/cs-api';
import { usePollingWindow } from './use-polling-window';

// One independent query per period instead of one bundled call, so each period can render as
// soon as its own data resolves instead of all 4 waiting on the slowest (legend, unfiltered).
// Per-period pattern otherwise unchanged: one triggering fetch on page load (starts a background
// recompute if the cache is stale) plus a separate, side-effect-free poll every 15s for 2 minutes
// after mount, then stopping -- that only reads whatever the cache currently holds and must never
// cause a recompute, so it hits a different, pure-read endpoint. refetchOnWindowFocus is off on
// the triggering query so tab-switching doesn't also trigger SQL.
function usePeriod(period: HonourBoardPeriodKey, refetchInterval: number | false) {
  const initial = useQuery(['honour-board', period], () => honourBoardApi.get(period), {
    refetchOnWindowFocus: false,
    onError: err => console.error('[honour-board] initial fetch failed', period, err),
  });
  const peek = useQuery(['honour-board-current', period], () => honourBoardApi.getCurrent(period), {
    refetchInterval,
    onError: err => console.error('[honour-board] peek fetch failed', period, err),
  });

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
