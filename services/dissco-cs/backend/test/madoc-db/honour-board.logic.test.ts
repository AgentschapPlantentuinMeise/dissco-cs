import { describe, expect, it } from 'vitest';

import { HonourBoardEntryDto } from '@dissco-cs/shared-types';
import { isHonourBoardPeriod, rankingToPeriod, sinceForPeriod } from '../../src/madoc-db/honour-board.logic.js';

// Local time, like the code: Thursday 15 October 2026, 14:30.
const thursday = new Date(2026, 9, 15, 14, 30);

describe('sinceForPeriod', () => {
  it('starts today at midnight', () => {
    expect(sinceForPeriod('today', thursday)).toEqual(new Date(2026, 9, 15));
  });

  it('starts the week on Monday', () => {
    expect(sinceForPeriod('week', thursday)).toEqual(new Date(2026, 9, 12));
  });

  it('treats Sunday as the last day of the week, not the first', () => {
    expect(sinceForPeriod('week', new Date(2026, 9, 18, 23, 0))).toEqual(new Date(2026, 9, 12));
  });

  it('starts the month on the 1st', () => {
    expect(sinceForPeriod('month', thursday)).toEqual(new Date(2026, 9, 1));
  });

  it('has no start for the legend (all time)', () => {
    expect(sinceForPeriod('legend', thursday)).toBeNull();
  });
});

describe('isHonourBoardPeriod', () => {
  it.each(['today', 'week', 'month', 'legend'])('accepts %s', period => {
    expect(isHonourBoardPeriod(period)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isHonourBoardPeriod('year')).toBe(false);
  });
});

describe('rankingToPeriod', () => {
  const entry = (name: string, rank: number): HonourBoardEntryDto => ({
    userUrn: `urn:madoc:user:${name}`,
    name,
    count: 10 - rank,
    rank,
  });
  // Ties share a rank (DENSE_RANK), so the top 3 ranks can hold more than three people.
  const ranking = [entry('anna', 1), entry('bert', 2), entry('chris', 2), entry('dirk', 3), entry('eva', 4)];

  it('shows everyone ranked 1 to 3', () => {
    expect(rankingToPeriod(ranking, null).top.map(e => e.name)).toEqual(['anna', 'bert', 'chris', 'dirk']);
  });

  it("finds the viewer's own entry outside the top 3", () => {
    expect(rankingToPeriod(ranking, 'urn:madoc:user:eva').you?.rank).toBe(4);
  });

  it('has no own entry for a viewer who is not ranked or not logged in', () => {
    expect(rankingToPeriod(ranking, 'urn:madoc:user:zoe').you).toBeNull();
    expect(rankingToPeriod(ranking, null).you).toBeNull();
  });
});
