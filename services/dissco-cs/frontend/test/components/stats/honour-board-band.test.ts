import { describe, expect, it } from 'vitest';

import { pickFeatured, rowsWithYou } from '../../../src/components/stats/honour-board-band';

const entry = (rank: number, name = `user${rank}`) => ({ userUrn: `urn:${name}`, name, count: 100 - rank, rank });

describe('rowsWithYou', () => {
  it('keeps the first entries only', () => {
    const rows = rowsWithYou({ top: [entry(1), entry(2), entry(3), entry(4)], you: null }, 3);
    expect(rows.map(row => row.entry.rank)).toEqual([1, 2, 3]);
    expect(rows.some(row => row.isYou)).toBe(false);
  });

  it('marks you when you are in the top', () => {
    const rows = rowsWithYou({ top: [entry(1), entry(2), entry(3)], you: entry(2) }, 3);
    expect(rows.map(row => [row.entry.rank, row.isYou, row.isExtra])).toEqual([
      [1, false, false],
      [2, true, false],
      [3, false, false],
    ]);
  });

  it('adds you below the top when you are not in it', () => {
    const rows = rowsWithYou({ top: [entry(1), entry(2), entry(3), entry(4)], you: entry(4) }, 3);
    expect(rows).toHaveLength(4);
    expect(rows[3]).toMatchObject({ isYou: true, isExtra: true, entry: { rank: 4 } });
  });

  it('gives nothing while the period is loading', () => {
    expect(rowsWithYou(undefined, 3)).toEqual([]);
  });
});

describe('pickFeatured', () => {
  const periods = [
    { period: 'today' as const, data: { top: [], you: null } },
    { period: 'week' as const, data: { top: [entry(1, 'anouk')], you: null } },
    { period: 'month' as const, data: undefined },
    { period: 'legend' as const, data: { top: [entry(1, 'kdewit')], you: null } },
  ];

  it('takes turns by the hour among periods that have a number 1', () => {
    expect(pickFeatured(periods, 0)).toMatchObject({ period: 'week', entry: { name: 'anouk' } });
    expect(pickFeatured(periods, 1)).toMatchObject({ period: 'legend', entry: { name: 'kdewit' } });
    expect(pickFeatured(periods, 2)).toMatchObject({ period: 'week' });
  });

  it('gives null when no period has anyone yet', () => {
    expect(pickFeatured(periods.slice(0, 1), 5)).toBeNull();
  });
});
