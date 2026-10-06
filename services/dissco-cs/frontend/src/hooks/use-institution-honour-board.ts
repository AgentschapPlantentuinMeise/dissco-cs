import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { institutionsApi } from '../api/cs-api';
import { HonourBoardPeriodKey } from '@dissco-cs/shared-types';
import { usePollingWindow } from './use-polling-window';

// Same per-period pattern as use-honour-board.ts, scoped to one institution's projects.
function usePeriod(slug: string | undefined, period: HonourBoardPeriodKey, refetchInterval: number | false) {
  const initial = useQuery({
    queryKey: ['institution-honour-board', slug, period],
    queryFn: () => institutionsApi.getHonourBoard(slug!, period),
    enabled: !!slug,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (initial.error) console.error('[institution-honour-board] initial fetch failed', slug, period, initial.error);
  }, [initial.error]);

  const peek = useQuery({
    queryKey: ['institution-honour-board-current', slug, period],
    queryFn: () => institutionsApi.getHonourBoardCurrent(slug!, period),
    enabled: !!slug,
    refetchInterval,
  });
  useEffect(() => {
    if (peek.error) console.error('[institution-honour-board] peek fetch failed', slug, period, peek.error);
  }, [peek.error]);

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
