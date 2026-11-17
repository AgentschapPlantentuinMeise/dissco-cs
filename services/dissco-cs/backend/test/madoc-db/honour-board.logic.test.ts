import { describe, expect, it } from 'vitest';
import { HonourBoardSettingsDto } from '@dissco-cs/shared-types';

import { canChooseWinner, QuarterCount, QuarterRecord, quarterToAdminDto, quarterToDto } from '../../src/madoc-db/honour-board.logic.js';

const count = (name: string, tasks: number): QuarterCount => ({ userUrn: `urn:madoc:user:${name}`, name, count: tasks });
const counts = [count('dirk', 40), count('anna', 25), count('bert', 24), count('chris', 3)];
const prizeMode: HonourBoardSettingsDto = { mode: 'prize', threshold: 25 };
const prize = { title: { nl: 'Rondleiding' }, note: {} };
// Chosen when the threshold was still 30: only dirk made it then.
const chosen: QuarterRecord = {
  prize,
  winnerUrn: 'urn:madoc:user:dirk',
  frozenPool: [count('dirk', 40)],
  frozenThreshold: 30,
  winnerChosenAt: new Date('2026-10-02T10:00:00.000Z'),
};

describe('quarterToDto', () => {
  it('puts everyone at or above the threshold in the pool, alphabetically, with their counts', () => {
    expect(quarterToDto(counts, prizeMode, null, null).pool).toEqual([
      { userUrn: 'urn:madoc:user:anna', name: 'anna', count: 25 },
      { userUrn: 'urn:madoc:user:dirk', name: 'dirk', count: 40 },
    ]);
  });

  it("gives the viewer's own count, also when below the threshold", () => {
    expect(quarterToDto(counts, prizeMode, null, 'urn:madoc:user:bert').you).toEqual({ userUrn: 'urn:madoc:user:bert', count: 24 });
  });

  it('gives a logged-in viewer without tasks a count of 0, and nobody a count when not logged in', () => {
    expect(quarterToDto(counts, prizeMode, null, 'urn:madoc:user:zoe').you).toEqual({ userUrn: 'urn:madoc:user:zoe', count: 0 });
    expect(quarterToDto(counts, prizeMode, null, null).you).toBeNull();
  });

  it('passes the mode and threshold on', () => {
    expect(quarterToDto([], prizeMode, null, null)).toEqual({ mode: 'prize', threshold: 25, pool: [], you: null, prize: null, winner: null });
  });

  it('uses the site threshold', () => {
    expect(quarterToDto(counts, { mode: 'prize', threshold: 3 }, null, null).pool).toHaveLength(4);
  });

  it('shows nothing in the mode off, not even the viewer', () => {
    expect(quarterToDto(counts, { mode: 'off', threshold: 25 }, chosen, 'urn:madoc:user:bert')).toEqual({
      mode: 'off', threshold: 25, pool: [], you: null, prize: null, winner: null,
    });
  });

  it('keeps the frozen pool and threshold once a winner is chosen, with a live count for the viewer', () => {
    const dto = quarterToDto(counts, prizeMode, chosen, 'urn:madoc:user:anna');
    expect(dto.pool.map(entry => entry.name)).toEqual(['dirk']);
    expect(dto.threshold).toBe(30);
    expect(dto.winner?.name).toBe('dirk');
    expect(dto.prize).toEqual(prize);
    expect(dto.you).toEqual({ userUrn: 'urn:madoc:user:anna', count: 25 });
  });

  it('leaves prize and winner out in the mode recognition', () => {
    const dto = quarterToDto(counts, { mode: 'recognition', threshold: 25 }, chosen, null);
    expect(dto.prize).toBeNull();
    expect(dto.winner).toBeNull();
  });
});

describe('quarterToAdminDto', () => {
  it('shows the live pool before a winner is chosen', () => {
    const dto = quarterToAdminDto('2026-Q3', counts, prizeMode, { ...chosen, winnerUrn: null, frozenPool: null, frozenThreshold: null, winnerChosenAt: null });
    expect(dto.pool.map(entry => entry.name)).toEqual(['anna', 'dirk']);
    expect(dto.winner).toBeNull();
    expect(dto.prize).toEqual(prize);
  });

  it('shows the frozen pool, the winner and when it was chosen, whatever the mode', () => {
    expect(quarterToAdminDto('2026-Q3', counts, { mode: 'recognition', threshold: 25 }, chosen)).toEqual({
      quarter: '2026-Q3',
      threshold: 30,
      pool: [count('dirk', 40)],
      prize,
      winner: count('dirk', 40),
      winnerChosenAt: '2026-10-02T10:00:00.000Z',
    });
  });
});

describe('canChooseWinner', () => {
  const pool = [count('anna', 25)];

  it('allows someone from the pool of an ended quarter in the mode prize', () => {
    expect(canChooseWinner('prize', true, pool, 'urn:madoc:user:anna')).toBe(true);
  });

  it('refuses someone outside the pool, a running quarter, or another mode', () => {
    expect(canChooseWinner('prize', true, pool, 'urn:madoc:user:bert')).toBe(false);
    expect(canChooseWinner('prize', false, pool, 'urn:madoc:user:anna')).toBe(false);
    expect(canChooseWinner('recognition', true, pool, 'urn:madoc:user:anna')).toBe(false);
    expect(canChooseWinner('off', true, pool, 'urn:madoc:user:anna')).toBe(false);
  });
});
