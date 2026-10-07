import { csFetch } from './request';
import { getSiteSlug } from '../slug';
import { HonourBoardPeriodDto, HonourBoardPeriodKey, InstitutionStatsDto, SiteStatsDto } from '@dissco-cs/shared-types';

// Without an institution slug the numbers cover the whole site, with one they're scoped to that
// active institution's projects.
const scopePath = (institutionSlug?: string) => (institutionSlug ? `/stats/institutions/${institutionSlug}` : '/stats');

function getStats(): Promise<SiteStatsDto>;
function getStats(institutionSlug: string): Promise<InstitutionStatsDto>;
function getStats(institutionSlug?: string) {
  return csFetch<SiteStatsDto | InstitutionStatsDto>(`${scopePath(institutionSlug)}?slug=${getSiteSlug()}`);
}

// Pure cache read, never triggers a recompute -- for periodic polling.
function getStatsCurrent(): Promise<SiteStatsDto>;
function getStatsCurrent(institutionSlug: string): Promise<InstitutionStatsDto>;
function getStatsCurrent(institutionSlug?: string) {
  return csFetch<SiteStatsDto | InstitutionStatsDto>(`${scopePath(institutionSlug)}/current?slug=${getSiteSlug()}`);
}

export const statsApi = {
  get: getStats,
  getCurrent: getStatsCurrent,

  getHonourBoard: (period: HonourBoardPeriodKey, institutionSlug?: string) =>
    csFetch<HonourBoardPeriodDto>(`${scopePath(institutionSlug)}/honour-board/${period}?slug=${getSiteSlug()}`),
  // Pure cache read, never triggers a recompute -- for periodic polling.
  getHonourBoardCurrent: (period: HonourBoardPeriodKey, institutionSlug?: string) =>
    csFetch<HonourBoardPeriodDto>(`${scopePath(institutionSlug)}/honour-board/${period}/current?slug=${getSiteSlug()}`),
};
