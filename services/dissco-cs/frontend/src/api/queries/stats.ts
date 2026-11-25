import { queryOptions } from '@tanstack/react-query';
import { statsApi } from '../cs-client/stats';
import { HonourBoardQuarterKey } from '@dissco-cs/shared-types';
import { LIVE } from './freshness';

// Without an institution slug the numbers cover the whole site, with one they're scoped to that
// institution. Each "current" variant is a cache-only read on the backend, for polling.
export const statsKeys = {
  all: ['stats'] as const,
  site: () => [...statsKeys.all, 'site'] as const,
  siteCurrent: () => [...statsKeys.all, 'site-current'] as const,
  institution: (slug: string | undefined) => [...statsKeys.all, 'institution', slug] as const,
  institutionCurrent: (slug: string | undefined) => [...statsKeys.all, 'institution-current', slug] as const,
  honourBoard: (quarter: HonourBoardQuarterKey) => [...statsKeys.all, 'honour-board', quarter] as const,
  honourBoardCurrent: (quarter: HonourBoardQuarterKey) => [...statsKeys.all, 'honour-board-current', quarter] as const,
};

// The normal fetch answers from the backend's cache and, when that is old, starts a recalculation
// in the database. So it runs each time a page shows the numbers, but not on a return to the browser
// tab: switching tabs would otherwise start database queries without anyone asking for new numbers.
const STARTS_RECALCULATION = { ...LIVE, refetchOnWindowFocus: false } as const;

export const statsQueries = {
  site: () => queryOptions({ queryKey: statsKeys.site(), queryFn: () => statsApi.get(), ...STARTS_RECALCULATION }),
  siteCurrent: () => queryOptions({ queryKey: statsKeys.siteCurrent(), queryFn: () => statsApi.getCurrent(), ...LIVE }),

  institution: (slug: string | undefined) =>
    queryOptions({ queryKey: statsKeys.institution(slug), queryFn: () => statsApi.get(slug!), enabled: !!slug, ...STARTS_RECALCULATION }),
  institutionCurrent: (slug: string | undefined) =>
    queryOptions({ queryKey: statsKeys.institutionCurrent(slug), queryFn: () => statsApi.getCurrent(slug!), enabled: !!slug, ...LIVE }),

  honourBoard: (quarter: HonourBoardQuarterKey) =>
    queryOptions({ queryKey: statsKeys.honourBoard(quarter), queryFn: () => statsApi.getHonourBoard(quarter), ...STARTS_RECALCULATION }),
  honourBoardCurrent: (quarter: HonourBoardQuarterKey) =>
    queryOptions({ queryKey: statsKeys.honourBoardCurrent(quarter), queryFn: () => statsApi.getHonourBoardCurrent(quarter), ...LIVE }),
};
