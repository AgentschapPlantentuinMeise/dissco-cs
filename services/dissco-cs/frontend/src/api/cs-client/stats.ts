import { csFetch } from './request';
import { urlPath, withSite } from '../url';
import { HonourBoardQuarterDto, HonourBoardQuarterKey, InstitutionStatsDto, SiteStatsDto } from '@dissco-cs/shared-types';

const scopePath = (institutionSlug?: string) => (institutionSlug ? urlPath`/stats/institutions/${institutionSlug}` : '/stats');

function getStats(): Promise<SiteStatsDto>;
function getStats(institutionSlug: string): Promise<InstitutionStatsDto>;
function getStats(institutionSlug?: string) {
  return csFetch<SiteStatsDto | InstitutionStatsDto>(withSite(scopePath(institutionSlug)));
}

function getStatsCurrent(): Promise<SiteStatsDto>;
function getStatsCurrent(institutionSlug: string): Promise<InstitutionStatsDto>;
function getStatsCurrent(institutionSlug?: string) {
  return csFetch<SiteStatsDto | InstitutionStatsDto>(withSite(`${scopePath(institutionSlug)}/current`));
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
   * The site's honour board for one quarter: everyone with at least the threshold of tasks (the
   * pool) and, when logged in, the caller's own number of tasks. A task counts in the quarter it
   * was claimed in, once submitted or accepted. Answers from the cache and refreshes it in the
   * background.
   * @param quarter the quarter, e.g. '2026-Q4' (quarterOf, quartersUpTo)
   * Who: anyone (`you` is only filled in for a logged-in caller).
   * Returns: HonourBoardQuarterDto; a quarter that has not started yet has an empty pool; 400 not a quarter.
   */
  getHonourBoard: (quarter: HonourBoardQuarterKey) => csFetch<HonourBoardQuarterDto>(withSite(urlPath`/stats/honour-board/${quarter}`)),

  /**
   * Same as getHonourBoard, but only reads the cache and never starts a refresh -- for periodic
   * polling. Falls back to getHonourBoard when nothing was cached yet.
   * @param quarter as in getHonourBoard
   * Who: anyone.
   * Returns: as getHonourBoard.
   */
  getHonourBoardCurrent: (quarter: HonourBoardQuarterKey) =>
    csFetch<HonourBoardQuarterDto>(withSite(urlPath`/stats/honour-board/${quarter}/current`)),
};
