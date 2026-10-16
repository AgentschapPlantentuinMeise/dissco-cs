import { HonourBoardEntryDto, HonourBoardPeriodDto, HonourBoardPeriodKey } from '@dissco-cs/shared-types';

const TOP_N = 3;

function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeek(now: Date): Date {
  const start = startOfDay(now);
  const mondayOffset = (start.getDay() + 6) % 7; // getDay(): 0=Sunday..6=Saturday -> 0=Monday..6=Sunday
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Where a period starts, in the server's local time; a week starts on Monday.
 * @param period the honour board period
 * @param now the current moment
 * Returns: the start of today, this week or this month; null for 'legend' (all time).
 */
export function sinceForPeriod(period: HonourBoardPeriodKey, now: Date): Date | null {
  switch (period) {
    case 'today':
      return startOfDay(now);
    case 'week':
      return startOfWeek(now);
    case 'month':
      return startOfMonth(now);
    case 'legend':
      return null;
  }
}

/**
 * What one viewer sees of a ranking: everyone ranked in the top 3 (ties share a rank, so this
 * can be more than three people), and the viewer's own entry wherever it is.
 * @param ranking the full ranking, ordered by rank
 * @param userUrn the viewer, e.g. 'urn:madoc:user:5'; null when not logged in
 * Returns: { top, you }; `you` is null when the viewer is not logged in or not ranked.
 */
export function rankingToPeriod(ranking: HonourBoardEntryDto[], userUrn: string | null): HonourBoardPeriodDto {
  const top = ranking.filter(entry => entry.rank <= TOP_N);
  const you = userUrn ? (ranking.find(entry => entry.userUrn === userUrn) ?? null) : null;
  return { top, you };
}
