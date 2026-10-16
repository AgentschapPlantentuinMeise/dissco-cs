import { csFetch } from './request';
import { getSiteSlug } from '../slug';
import { HonourBoardPeriodDto, HonourBoardPeriodKey, InstitutionStatsDto, SiteStatsDto } from '@dissco-cs/shared-types';

const scopePath = (institutionSlug?: string) => (institutionSlug ? `/stats/institutions/${institutionSlug}` : '/stats');

function getStats(): Promise<SiteStatsDto>;
function getStats(institutionSlug: string): Promise<InstitutionStatsDto>;
function getStats(institutionSlug?: string) {
  return csFetch<SiteStatsDto | InstitutionStatsDto>(`${scopePath(institutionSlug)}?slug=${getSiteSlug()}`);
}

function getStatsCurrent(): Promise<SiteStatsDto>;
function getStatsCurrent(institutionSlug: string): Promise<InstitutionStatsDto>;
function getStatsCurrent(institutionSlug?: string) {
  return csFetch<SiteStatsDto | InstitutionStatsDto>(`${scopePath(institutionSlug)}/current?slug=${getSiteSlug()}`);
}

export const statsApi = {
  /**
   * The public counters (volunteers, tasks done / total). Answers from the cache right away and
   * recalculates in the background, so the next call sees newer numbers (the very first call,
   * with nothing cached yet, waits for the calculation). The volunteer count is recalculated at
   * most every 5 minutes.
   * @param institutionSlug optional: the active institution to count for (its linked projects);
   *   without it the numbers cover the whole site
   * Who: anyone.
   * Returns: SiteStatsDto, or InstitutionStatsDto with a slug; 404 unknown or inactive institution.
   */
  get: getStats,

  /**
   * Same numbers as get, for periodic polling: returns the cached value without recalculating
   * (with nothing cached yet, it calculates once). Exception: for the whole site, the volunteer
   * count still recalculates when it is older than 5 minutes.
   * @param institutionSlug optional, as in get
   * Who: anyone.
   * Returns: as get.
   */
  getCurrent: getStatsCurrent,

  /**
   * The honour board of one period: the top volunteers and, when logged in, the caller's own place.
   * Answers from the cache and refreshes it in the background.
   * @param period 'today', 'week', 'month' or 'legend' (all time) -- HONOUR_BOARD_PERIODS
   * @param institutionSlug optional: only count work on this active institution's projects
   * Who: anyone (`you` is only filled in for a logged-in caller).
   * Returns: { top, you }; 400 unknown period; 404 unknown or inactive institution.
   */
  getHonourBoard: (period: HonourBoardPeriodKey, institutionSlug?: string) =>
    csFetch<HonourBoardPeriodDto>(`${scopePath(institutionSlug)}/honour-board/${period}?slug=${getSiteSlug()}`),

  /**
   * Same as getHonourBoard, but only reads the cache and never starts a refresh -- for periodic
   * polling. Falls back to getHonourBoard when nothing was cached yet.
   * @param period as in getHonourBoard
   * @param institutionSlug optional, as in getHonourBoard
   * Who: anyone.
   * Returns: as getHonourBoard.
   */
  getHonourBoardCurrent: (period: HonourBoardPeriodKey, institutionSlug?: string) =>
    csFetch<HonourBoardPeriodDto>(`${scopePath(institutionSlug)}/honour-board/${period}/current?slug=${getSiteSlug()}`),
};
