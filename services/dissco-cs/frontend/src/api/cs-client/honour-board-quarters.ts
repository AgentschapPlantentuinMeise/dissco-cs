import { csFetch } from './request';
import { urlPath } from '../url';
import { HonourBoardPrizeDto, HonourBoardQuarterAdminDto, HonourBoardQuarterKey } from '@dissco-cs/shared-types';

export const honourBoardQuartersApi = {
  /**
   * A quarter as management shows it: its pool with each volunteer's number of tasks, its
   * thank-you and its winner.
   * @param quarter e.g. '2026-Q3' (quartersUpTo)
   * Who: site admin.
   * Returns: HonourBoardQuarterAdminDto; once a winner is chosen, the pool and threshold frozen at
   *   that moment.
   */
  get: (quarter: HonourBoardQuarterKey) => csFetch<HonourBoardQuarterAdminDto>(urlPath`/honour-board-quarters/${quarter}`),

  /**
   * Sets or replaces the thank-you of a quarter.
   * @param quarter e.g. '2026-Q3'
   * @param prize title in every site language, an optional note per language. Validated by
   *   honourBoardPrizeSchema.
   * Who: site admin.
   * Returns: nothing (204).
   */
  setPrize: (quarter: HonourBoardQuarterKey, prize: HonourBoardPrizeDto) =>
    csFetch<void>(urlPath`/honour-board-quarters/${quarter}/prize`, { method: 'PUT', body: JSON.stringify(prize) }),

  /**
   * Removes the thank-you of a quarter.
   * @param quarter e.g. '2026-Q3'
   * Who: site admin.
   * Returns: nothing (204).
   */
  deletePrize: (quarter: HonourBoardQuarterKey) => csFetch<void>(urlPath`/honour-board-quarters/${quarter}/prize`, { method: 'DELETE' }),

  /**
   * Chooses the winner of a quarter and freezes its pool and threshold. Choosing again picks from
   * that same frozen pool, to correct a mistake.
   * @param quarter e.g. '2026-Q3'; the quarter must be over
   * @param userUrn a volunteer from the pool (HonourBoardPoolEntryDto.userUrn). Validated by
   *   honourBoardWinnerSchema.
   * Who: site admin.
   * Returns: nothing (204); 409 when the quarter is still running, the volunteer is not in the
   *   pool, or the site's mode is not 'prize'.
   */
  setWinner: (quarter: HonourBoardQuarterKey, userUrn: string) =>
    csFetch<void>(urlPath`/honour-board-quarters/${quarter}/winner`, { method: 'PUT', body: JSON.stringify({ userUrn }) }),
};
