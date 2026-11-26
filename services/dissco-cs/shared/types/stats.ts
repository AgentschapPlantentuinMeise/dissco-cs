import { z } from 'zod';
import { MultilingualText, multilingualTextSchema } from './common.js';
import { HonourBoardMode } from './site-settings.js';

// refreshing (on every stats answer): the backend is recalculating these numbers in the background,
// so its /current route will soon have newer ones. The frontend polls only while this is true.

export type SiteStatsDto = {
  volunteers: number;
  tasksCompleted: number;
  tasksTotal: number;
  refreshing: boolean;
};

export type InstitutionStatsDto = {
  volunteers: number;
  tasksCompleted: number;
  tasksTotal: number;
  projectsActive: number;
  projectsCompleted: number;
  refreshing: boolean;
};

// A calendar quarter, e.g. '2026-Q4' for October to December 2026.
export type HonourBoardQuarterKey = `${number}-Q${1 | 2 | 3 | 4}`;

// The number of tasks a volunteer needs in a quarter to be in that quarter's pool.
export const HONOUR_BOARD_DEFAULT_THRESHOLD = 25;

export type HonourBoardPoolEntryDto = { userUrn: string; name: string; count: number };

// What a site admin sets as the thank-you of a quarter: a short title and an optional explanation.
export type HonourBoardPrizeDto = { title: MultilingualText; note: MultilingualText };

export type HonourBoardQuarterDto = {
  mode: HonourBoardMode;
  threshold: number;
  // Alphabetical, not ranked: being in the pool is what counts. The count sets the height of each
  // volunteer's bar on the timeline. Empty when the mode is 'off'.
  pool: HonourBoardPoolEntryDto[];
  // The caller and their own number of tasks this quarter; null when not logged in.
  you: { userUrn: string; count: number } | null;
  // Both only in the mode 'prize', otherwise null.
  prize: HonourBoardPrizeDto | null;
  winner: HonourBoardPoolEntryDto | null;
  refreshing: boolean;
};

// A quarter as a site admin sees it in management, whatever the mode. Once a winner is chosen, the
// pool and threshold are the ones frozen at that moment.
export type HonourBoardQuarterAdminDto = {
  quarter: HonourBoardQuarterKey;
  threshold: number;
  pool: HonourBoardPoolEntryDto[];
  prize: HonourBoardPrizeDto | null;
  winner: HonourBoardPoolEntryDto | null;
  winnerChosenAt: string | null;
};

export const MAX_HONOUR_BOARD_PRIZE_TITLE_LENGTH = 120;
export const MAX_HONOUR_BOARD_PRIZE_NOTE_LENGTH = 1_000;

export const honourBoardPrizeSchema = z.strictObject({
  title: multilingualTextSchema(true, MAX_HONOUR_BOARD_PRIZE_TITLE_LENGTH),
  note: multilingualTextSchema(false, MAX_HONOUR_BOARD_PRIZE_NOTE_LENGTH),
});

// The winner is named by the URN of a volunteer in the quarter's pool (HonourBoardPoolEntryDto.userUrn).
export const honourBoardWinnerSchema = z.strictObject({
  userUrn: z.string().regex(/^urn:madoc:user:\d+$/),
});

/**
 * Whether a text is a quarter key such as '2026-Q4'.
 * @param value any text, e.g. a path parameter
 * Returns: true for a four-digit year, '-Q' and a quarter from 1 to 4.
 */
export function isHonourBoardQuarterKey(value: string): value is HonourBoardQuarterKey {
  return /^\d{4}-Q[1-4]$/.test(value);
}

/**
 * The quarter a moment falls in, in local time.
 * @param date the moment
 * Returns: its key, e.g. '2026-Q4' for 3 November 2026.
 */
export function quarterOf(date: Date): HonourBoardQuarterKey {
  return `${date.getFullYear()}-Q${(Math.floor(date.getMonth() / 3) + 1) as 1 | 2 | 3 | 4}`;
}

/**
 * Where a quarter starts and where the next one starts, in local time.
 * @param key a quarter key (isHonourBoardQuarterKey)
 * Returns: { start, end }; `end` is the first moment after the quarter, so a moment belongs to the
 *   quarter when start <= moment < end.
 */
export function quarterRange(key: HonourBoardQuarterKey): { start: Date; end: Date } {
  const [year, quarter] = key.split('-Q').map(Number);
  const firstMonth = (quarter - 1) * 3;
  return { start: new Date(year, firstMonth, 1), end: new Date(year, firstMonth + 3, 1) };
}

/**
 * Whether a quarter is over: only then can a winner be chosen, and its counts change only when a
 * reviewer rejects a task.
 * @param key a quarter key (isHonourBoardQuarterKey)
 * @param now the current moment, a parameter so it can be tested
 * Returns: true from the first moment of the next quarter on.
 */
export function isQuarterOver(key: HonourBoardQuarterKey, now: Date): boolean {
  return quarterRange(key).end <= now;
}

/**
 * A quarter and the quarters just before it, across the turn of the year.
 * @param last the newest quarter, e.g. the running one (quarterOf(new Date()))
 * @param count how many quarters, `last` included
 * Returns: the quarters oldest first, e.g. ('2027-Q1', 4) -> ['2026-Q2', '2026-Q3', '2026-Q4', '2027-Q1'].
 */
export function quartersUpTo(last: HonourBoardQuarterKey, count: number): HonourBoardQuarterKey[] {
  const [year, quarter] = last.split('-Q').map(Number);
  const index = year * 4 + quarter - 1;
  return Array.from({ length: count }, (_, i): HonourBoardQuarterKey => {
    const at = index - (count - 1) + i;
    return `${Math.floor(at / 4)}-Q${((at % 4) + 1) as 1 | 2 | 3 | 4}`;
  });
}
