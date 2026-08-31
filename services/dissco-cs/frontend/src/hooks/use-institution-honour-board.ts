import { useQuery } from 'react-query';
import { institutionsApi, HonourBoardPeriodKey } from '../api/cs-api';
import { usePollingWindow } from './use-polling-window';

// Same per-period pattern as use-honour-board.ts, scoped to one institution's projects.
function usePeriod(slug: string | undefined, period: HonourBoardPeriodKey, refetchInterval: number | false) {
  const initial = useQuery(['institution-honour-board', slug, period], () => institutionsApi.getHonourBoard(slug!, period), {
    enabled: !!slug,
    refetchOnWindowFocus: false,
    onError: err => console.error('[institution-honour-board] initial fetch failed', slug, period, err),
  });
  const peek = useQuery(
    ['institution-honour-board-current', slug, period],
    () => institutionsApi.getHonourBoardCurrent(slug!, period),
    {
      enabled: !!slug,
      refetchInterval,
      onError: err => console.error('[institution-honour-board] peek fetch failed', slug, period, err),
    }
  );

  return { ...initial, data: peek.data ?? initial.data };
}

export function useInstitutionHonourBoard(slug: string | undefined) {
  const refetchInterval = usePollingWindow();

  return {
    today: usePeriod(slug, 'today', refetchInterval),
    week: usePeriod(slug, 'week', refetchInterval),
    month: usePeriod(slug, 'month', refetchInterval),
    legend: usePeriod(slug, 'legend', refetchInterval),
  };
}
