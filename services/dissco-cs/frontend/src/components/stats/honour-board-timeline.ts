import { HonourBoardPoolEntryDto, HonourBoardQuarterKey, isQuarterOver, quarterOf, quarterRange, quartersUpTo } from '@dissco-cs/shared-types';

export type QuarterKind = 'past' | 'current';

export interface QuarterInfo {
  key: HonourBoardQuarterKey;
  kind: QuarterKind;
  start: Date;
  // The quarter's last day; quarterRange's `end` is the first moment of the next quarter.
  lastDay: Date;
  // How much of the quarter has gone by, from 0 to 1.
  progress: number;
  // Days left in a running quarter, today included; 0 for any other quarter.
  daysLeft: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// The running quarter and the three before it: in January the band still shows last year.
const QUARTERS_ON_BAND = 4;

/**
 * The running quarter and the three before it, across the turn of the year.
 * @param now the current moment, a parameter so the quarters can be tested
 * Returns: four quarters, oldest first; only the last one is running.
 */
export function quarterTimeline(now: Date): QuarterInfo[] {
  return quartersUpTo(quarterOf(now), QUARTERS_ON_BAND).map(key => {
    const { start, end } = quarterRange(key);
    const kind: QuarterKind = isQuarterOver(key, now) ? 'past' : 'current';
    const progress = kind === 'past' ? 1 : (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
    return {
      key,
      kind,
      start,
      lastDay: new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1),
      progress,
      daysLeft: kind === 'current' ? Math.ceil((end.getTime() - now.getTime()) / DAY_MS) : 0,
    };
  });
}

/**
 * How far a volunteer is from the pool.
 * @param count the volunteer's number of tasks this quarter
 * @param threshold the quarter's threshold
 * Returns: `toGo` the tasks still needed (0 once in the pool), `percent` how far along, at most 100.
 */
export function progressToThreshold(count: number, threshold: number): { toGo: number; percent: number } {
  return {
    toGo: Math.max(0, threshold - count),
    percent: threshold > 0 ? Math.min(100, Math.round((count / threshold) * 100)) : 100,
  };
}

// The lowest bar is still clearly a bar, not a line.
const MIN_BAR = 0.1;

// The share of the pool below the full height. The few above it get the full height too, so one
// volunteer with thousands of tasks does not flatten the bars of everyone else.
const TOP_SHARE = 0.9;

/**
 * The number of tasks that gets the full bar height in a quarter: the 90th percentile of the pool.
 * @param counts every volunteer's number of tasks in the pool
 * @param threshold the quarter's threshold, used when the pool is empty
 * Returns: e.g. 60 for 25, 30, 40, 60 and 2,000 tasks.
 */
export function barTop(counts: number[], threshold: number): number {
  if (counts.length === 0) return threshold;
  const sorted = [...counts].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * TOP_SHARE)];
}

/**
 * How tall a volunteer's bar is, on a plain scale from the threshold to the top (barTop): most
 * volunteers sit in that range, so the differences between them stay visible.
 * @param count the volunteer's number of tasks, at least the threshold
 * @param threshold the quarter's threshold: the lowest bar
 * @param top the count that gets the full height (barTop)
 * Returns: a fraction from 0.1 (the threshold) to 1 (the top and above); 1 when everyone has the same count.
 */
export function barHeight(count: number, threshold: number, top: number): number {
  if (top <= threshold) return 1;
  const position = (count - threshold) / (top - threshold);
  return MIN_BAR + Math.min(1, Math.max(0, position)) * (1 - MIN_BAR);
}

/**
 * The pool in the order of the bars: from fewest to most tasks, so the bars rise like steps and a
 * volunteer sees where they stand. Volunteers with the same count keep the pool's alphabetical order.
 * @param pool the quarter's pool, alphabetical as the backend sends it
 * Returns: a new list; the pool itself stays alphabetical for the list of names.
 */
export function barsInOrder(pool: HonourBoardPoolEntryDto[]): HonourBoardPoolEntryDto[] {
  return [...pool].sort((a, b) => a.count - b.count);
}

// How many bars to each side a label above a bar can cover; in a crowded pool bars are 2px wide.
const LABEL_REACH = 5;

/**
 * Whether the "you" label fits above your bar. A label is wider than a bar, so next to the winner's
 * award the two would run into each other; the award stays, and the line below the quarter still
 * names you.
 * @param pool the quarter's pool, in the order of the bars
 * @param youUrn the logged-in volunteer (HonourBoardQuarterDto.you), undefined when logged out
 * @param winnerUrn the quarter's winner, undefined when none is chosen
 * Returns: false when you are not in the pool, are the winner, or are within 5 bars of the winner.
 */
export function showYouLabel(pool: HonourBoardPoolEntryDto[], youUrn: string | undefined, winnerUrn: string | undefined): boolean {
  const youAt = pool.findIndex(entry => entry.userUrn === youUrn);
  if (youAt < 0 || youUrn === winnerUrn) return false;
  const winnerAt = pool.findIndex(entry => entry.userUrn === winnerUrn);
  return winnerAt < 0 || Math.abs(youAt - winnerAt) > LABEL_REACH;
}

/**
 * The name of a quarter as shown on the band; the year is part of it, because the band runs
 * across the turn of the year.
 * @param key e.g. '2026-Q4'
 * Returns: e.g. 'Q4 2026'.
 */
export function quarterLabel(key: HonourBoardQuarterKey): string {
  const [year, quarter] = key.split('-');
  return `${quarter} ${year}`;
}
