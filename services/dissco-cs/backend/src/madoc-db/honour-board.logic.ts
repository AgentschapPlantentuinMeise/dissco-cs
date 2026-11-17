import {
  HonourBoardPoolEntryDto,
  HonourBoardPrizeDto,
  HonourBoardQuarterAdminDto,
  HonourBoardQuarterDto,
  HonourBoardQuarterKey,
  HonourBoardSettingsDto,
} from '@dissco-cs/shared-types';

// How many tasks one volunteer counts in a quarter.
export type QuarterCount = HonourBoardPoolEntryDto;

// What a site admin stored for one quarter: the thank-you, and once a winner is chosen, the pool
// and threshold of that moment. Frozen, so a later rejection or a new threshold no longer changes
// who was in the pool the jury chose from.
export type QuarterRecord = {
  prize: HonourBoardPrizeDto | null;
  winnerUrn: string | null;
  frozenPool: QuarterCount[] | null;
  frozenThreshold: number | null;
  winnerChosenAt: Date | null;
};

/**
 * Everyone with at least `threshold` tasks, alphabetically.
 * @param counts the number of tasks per volunteer in the quarter, in any order
 * @param threshold the minimum number of tasks for the pool
 * Returns: the pool entries.
 */
export function poolOf(counts: QuarterCount[], threshold: number): QuarterCount[] {
  return counts
    .filter(entry => entry.count >= threshold)
    .map(({ userUrn, name, count }) => ({ userUrn, name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The pool and threshold of a quarter: the ones frozen when a winner was chosen, otherwise the live
 * ones. Choosing again (to correct a mistake) therefore picks from the same frozen pool.
 * @param counts the live number of tasks per volunteer in the quarter
 * @param settings the site's mode and threshold
 * @param record what a site admin stored for the quarter; null when nothing
 * Returns: { pool, threshold }.
 */
export function quarterPool(
  counts: QuarterCount[],
  settings: HonourBoardSettingsDto,
  record: QuarterRecord | null
): { pool: QuarterCount[]; threshold: number } {
  if (record?.frozenPool) {
    return { pool: poolOf(record.frozenPool, 0), threshold: record.frozenThreshold ?? settings.threshold };
  }
  return { pool: poolOf(counts, settings.threshold), threshold: settings.threshold };
}

/**
 * What one viewer sees of a quarter on the band.
 * @param counts the live number of tasks per volunteer in the quarter, in any order
 * @param settings the site's mode and threshold
 * @param record what a site admin stored for the quarter; null when nothing
 * @param userUrn the viewer, e.g. 'urn:madoc:user:5'; null when not logged in
 * Returns: HonourBoardQuarterDto. Mode 'off': an empty pool and no viewer. A logged-in viewer
 *   without tasks this quarter has count 0; their count stays live after a winner is chosen. Prize
 *   and winner only in the mode 'prize'.
 */
export function quarterToDto(
  counts: QuarterCount[],
  settings: HonourBoardSettingsDto,
  record: QuarterRecord | null,
  userUrn: string | null
): HonourBoardQuarterDto {
  if (settings.mode === 'off') {
    return { mode: 'off', threshold: settings.threshold, pool: [], you: null, prize: null, winner: null };
  }

  const { pool, threshold } = quarterPool(counts, settings, record);
  const you = userUrn ? { userUrn, count: counts.find(entry => entry.userUrn === userUrn)?.count ?? 0 } : null;
  const withPrize = settings.mode === 'prize';
  return {
    mode: settings.mode,
    threshold,
    pool,
    you,
    prize: withPrize ? (record?.prize ?? null) : null,
    winner: withPrize ? (pool.find(entry => entry.userUrn === record?.winnerUrn) ?? null) : null,
  };
}

/**
 * A quarter as a site admin sees it in management, in every mode.
 * @param quarter the quarter
 * @param counts the live number of tasks per volunteer in the quarter
 * @param settings the site's mode and threshold
 * @param record what a site admin stored for the quarter; null when nothing
 * Returns: HonourBoardQuarterAdminDto, with the frozen pool once a winner is chosen.
 */
export function quarterToAdminDto(
  quarter: HonourBoardQuarterKey,
  counts: QuarterCount[],
  settings: HonourBoardSettingsDto,
  record: QuarterRecord | null
): HonourBoardQuarterAdminDto {
  const { pool, threshold } = quarterPool(counts, settings, record);
  return {
    quarter,
    threshold,
    pool,
    prize: record?.prize ?? null,
    winner: pool.find(entry => entry.userUrn === record?.winnerUrn) ?? null,
    winnerChosenAt: record?.winnerChosenAt?.toISOString() ?? null,
  };
}

/**
 * Whether a site admin may choose this volunteer as the winner of a quarter.
 * @param mode the site's mode: only 'prize' has a winner
 * @param quarterEnded true once the quarter is over: the pool can still grow while it runs
 * @param pool the pool to choose from (the frozen one when a winner was chosen before)
 * @param userUrn the volunteer to choose
 * Returns: true when all three hold and the volunteer is in the pool.
 */
export function canChooseWinner(mode: HonourBoardSettingsDto['mode'], quarterEnded: boolean, pool: QuarterCount[], userUrn: string): boolean {
  return mode === 'prize' && quarterEnded && pool.some(entry => entry.userUrn === userUrn);
}
