import { queryOptions } from '@tanstack/react-query';
import { statsApi } from '../cs-client/stats';
import { HonourBoardPeriodKey } from '@dissco-cs/shared-types';

// Without an institution slug the numbers cover the whole site, with one they're scoped to that
// institution. Each "current" variant is a cache-only read on the backend, for polling.
export const statsKeys = {
  all: ['stats'] as const,
  site: () => [...statsKeys.all, 'site'] as const,
  siteCurrent: () => [...statsKeys.all, 'site-current'] as const,
  institution: (slug: string | undefined) => [...statsKeys.all, 'institution', slug] as const,
  institutionCurrent: (slug: string | undefined) => [...statsKeys.all, 'institution-current', slug] as const,
  honourBoard: (period: HonourBoardPeriodKey, slug?: string) => [...statsKeys.all, 'honour-board', period, slug ?? null] as const,
  honourBoardCurrent: (period: HonourBoardPeriodKey, slug?: string) =>
    [...statsKeys.all, 'honour-board-current', period, slug ?? null] as const,
};

export const statsQueries = {
  site: () => queryOptions({ queryKey: statsKeys.site(), queryFn: () => statsApi.get() }),
  siteCurrent: () => queryOptions({ queryKey: statsKeys.siteCurrent(), queryFn: () => statsApi.getCurrent() }),

  institution: (slug: string | undefined) =>
    queryOptions({ queryKey: statsKeys.institution(slug), queryFn: () => statsApi.get(slug!), enabled: !!slug }),
  institutionCurrent: (slug: string | undefined) =>
    queryOptions({ queryKey: statsKeys.institutionCurrent(slug), queryFn: () => statsApi.getCurrent(slug!), enabled: !!slug }),

  honourBoard: (period: HonourBoardPeriodKey, slug?: string) =>
    queryOptions({ queryKey: statsKeys.honourBoard(period, slug), queryFn: () => statsApi.getHonourBoard(period, slug) }),
  honourBoardCurrent: (period: HonourBoardPeriodKey, slug?: string) =>
    queryOptions({ queryKey: statsKeys.honourBoardCurrent(period, slug), queryFn: () => statsApi.getHonourBoardCurrent(period, slug) }),
};
