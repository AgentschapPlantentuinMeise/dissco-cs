import { describe, expect, it } from 'vitest';

import {
  barHeight,
  barsInOrder,
  barTop,
  progressToThreshold,
  quarterLabel,
  quarterTimeline,
  showYouLabel,
} from '../../../src/components/stats/honour-board-timeline';

// Local time, like the code: Tuesday 3 November 2026, 14:00.
const now = new Date(2026, 10, 3, 14, 0);

describe('quarterTimeline', () => {
  it('marks Q1 to Q3 as past and Q4 as running on 3 November', () => {
    expect(quarterTimeline(now).map(q => [q.key, q.kind])).toEqual([
      ['2026-Q1', 'past'],
      ['2026-Q2', 'past'],
      ['2026-Q3', 'past'],
      ['2026-Q4', 'current'],
    ]);
  });

  it('still shows last year early in the year', () => {
    expect(quarterTimeline(new Date(2027, 1, 15)).map(q => [q.key, q.kind])).toEqual([
      ['2026-Q2', 'past'],
      ['2026-Q3', 'past'],
      ['2026-Q4', 'past'],
      ['2027-Q1', 'current'],
    ]);
  });

  it('counts today among the days left and ends Q4 on 31 December', () => {
    const q4 = quarterTimeline(now)[3];
    expect(q4.daysLeft).toBe(59);
    expect(q4.lastDay).toEqual(new Date(2026, 11, 31));
  });

  it('gives a past quarter full progress and no days left', () => {
    expect(quarterTimeline(now)[0]).toMatchObject({ progress: 1, daysLeft: 0 });
  });
});

describe('progressToThreshold', () => {
  it('counts the tasks still needed', () => {
    expect(progressToThreshold(18, 25)).toEqual({ toGo: 7, percent: 72 });
  });

  it('needs nothing more at the threshold or above, and stops at 100%', () => {
    expect(progressToThreshold(25, 25)).toEqual({ toGo: 0, percent: 100 });
    expect(progressToThreshold(60, 25)).toEqual({ toGo: 0, percent: 100 });
  });
});

describe('barTop', () => {
  it('takes the 90th percentile, so one outlier does not set the full height', () => {
    expect(barTop([2000, 25, 60, 30, 40], 25)).toBe(60);
  });

  it('is the threshold for an empty pool and the one count for a pool of one', () => {
    expect(barTop([], 25)).toBe(25);
    expect(barTop([31], 25)).toBe(31);
  });
});

describe('barHeight', () => {
  it('gives the threshold the lowest bar and the top the full height', () => {
    expect(barHeight(25, 25, 60)).toBeCloseTo(0.1);
    expect(barHeight(60, 25, 60)).toBeCloseTo(1);
  });

  it('grows evenly in between, so the middle group stays apart', () => {
    expect(barHeight(42.5, 25, 60)).toBeCloseTo(0.55);
  });

  it('gives everyone above the top the full height', () => {
    expect(barHeight(2000, 25, 60)).toBe(1);
  });

  it('gives everyone the full height when they all have the same count', () => {
    expect(barHeight(25, 25, 25)).toBe(1);
  });
});

describe('barsInOrder', () => {
  const entry = (name: string, count: number) => ({ userUrn: `urn:madoc:user:${name}`, name, count });

  it('puts the bars from fewest to most tasks, keeping alphabetical order for the same count', () => {
    const pool = [entry('Anna', 40), entry('Bram', 25), entry('Cleo', 40), entry('Dirk', 30)];
    expect(barsInOrder(pool).map(e => e.name)).toEqual(['Bram', 'Dirk', 'Anna', 'Cleo']);
  });

  it('leaves the pool itself alphabetical', () => {
    const pool = [entry('Anna', 40), entry('Bram', 25)];
    barsInOrder(pool);
    expect(pool.map(e => e.name)).toEqual(['Anna', 'Bram']);
  });
});

describe('showYouLabel', () => {
  // Ten volunteers in the order of the bars: urn:madoc:user:0 to urn:madoc:user:9.
  const pool = Array.from({ length: 10 }, (_, i) => ({ userUrn: `urn:madoc:user:${i}`, name: `V${i}`, count: 30 }));

  it('shows the label when there is no winner yet', () => {
    expect(showYouLabel(pool, 'urn:madoc:user:3', undefined)).toBe(true);
  });

  it('leaves it out within five bars of the winner, and shows it further away', () => {
    expect(showYouLabel(pool, 'urn:madoc:user:3', 'urn:madoc:user:8')).toBe(false);
    expect(showYouLabel(pool, 'urn:madoc:user:2', 'urn:madoc:user:8')).toBe(true);
  });

  it('leaves it out when you are the winner or not in the pool', () => {
    expect(showYouLabel(pool, 'urn:madoc:user:3', 'urn:madoc:user:3')).toBe(false);
    expect(showYouLabel(pool, 'urn:madoc:user:42', undefined)).toBe(false);
    expect(showYouLabel(pool, undefined, undefined)).toBe(false);
  });
});

describe('quarterLabel', () => {
  it('puts the year after the quarter', () => {
    expect(quarterLabel('2026-Q4')).toBe('Q4 2026');
  });
});
