import { useQuery } from '@tanstack/react-query';
import { statsQueries } from '../api/queries/stats';
import { HonourBoardPeriodKey } from '@dissco-cs/shared-types';
import { usePollingWindow } from './use-polling-window';

// One query per period instead of one combined call, so each period shows as soon as its own data
// is in, instead of all four waiting for the slowest (the all-time legend).
// Per period: one normal fetch when the page opens (the backend answers from its cache and
// recalculates in the background), plus a cache-only poll every 15 s during the first 2 minutes,
// which never starts a recalculation. refetchOnWindowFocus is off on the normal fetch, so
// switching browser tabs does not start database queries.
// Without a slug the board covers the whole site; with one, that institution.
function usePeriod(slug: string | undefined, enabled: boolean, period: HonourBoardPeriodKey, refetchInterval: number | false) {
  const initial = useQuery({ ...statsQueries.honourBoard(period, slug), enabled, refetchOnWindowFocus: false });
  const peek = useQuery({ ...statsQueries.honourBoardCurrent(period, slug), enabled, refetchInterval });
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
