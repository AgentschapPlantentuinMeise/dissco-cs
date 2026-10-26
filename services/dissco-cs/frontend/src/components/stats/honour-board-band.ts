import { HonourBoardEntryDto, HonourBoardPeriodDto, HonourBoardPeriodKey } from '@dissco-cs/shared-types';

export interface HonourBoardRow {
  entry: HonourBoardEntryDto;
  isYou: boolean;
  // You, shown below the top because you are not in it.
  isExtra: boolean;
}

/**
 * The first `limit` entries of a period, with the caller marked as "you" when among them, or added
 * below them when not (the backend sends the caller's own place as `you`).
 */
export function rowsWithYou(period: HonourBoardPeriodDto | undefined, limit: number): HonourBoardRow[] {
  if (!period) {
    return [];
  }

  const youUrn = period.you?.userUrn;
  const rows = period.top.slice(0, limit).map(entry => ({ entry, isYou: entry.userUrn === youUrn, isExtra: false }));
  if (period.you && !rows.some(row => row.isYou)) {
    rows.push({ entry: period.you, isYou: true, isExtra: true });
  }
  return rows;
}

export interface FeaturedVolunteer {
  period: HonourBoardPeriodKey;
  entry: HonourBoardEntryDto;
}

/**
 * The volunteer in the spotlight: the number 1 of one period, taking turns by the hour. Only
 * periods that have a number 1 take part.
 */
export function pickFeatured(
  periods: Array<{ period: HonourBoardPeriodKey; data: HonourBoardPeriodDto | undefined }>,
  hour: number
): FeaturedVolunteer | null {
  const candidates = periods.flatMap(({ period, data }) => (data?.top[0] ? [{ period, entry: data.top[0] }] : []));
  return candidates.length > 0 ? candidates[hour % candidates.length] : null;
}
