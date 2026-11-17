import { describe, expect, it } from 'vitest';

// The shared package has no test runner of its own; its pure helpers are tested here.
import { isHonourBoardQuarterKey, isQuarterOver, quarterOf, quarterRange, quartersUpTo } from '@dissco-cs/shared-types';

describe('isHonourBoardQuarterKey', () => {
  it('accepts a year with Q1 to Q4 and nothing else', () => {
    expect(isHonourBoardQuarterKey('2026-Q1')).toBe(true);
    expect(isHonourBoardQuarterKey('2026-Q4')).toBe(true);
    expect(isHonourBoardQuarterKey('2026-Q5')).toBe(false);
    expect(isHonourBoardQuarterKey('2026-q1')).toBe(false);
    expect(isHonourBoardQuarterKey('26-Q1')).toBe(false);
  });
});

describe('quarterOf', () => {
  it('puts the last day of March in Q1 and the first of April in Q2', () => {
    expect(quarterOf(new Date(2026, 2, 31, 23, 59))).toBe('2026-Q1');
    expect(quarterOf(new Date(2026, 3, 1, 0, 0))).toBe('2026-Q2');
  });

  it('puts 3 November in Q4', () => {
    expect(quarterOf(new Date(2026, 10, 3))).toBe('2026-Q4');
  });
});

describe('quarterRange', () => {
  it('runs from the first day of the quarter up to the first day of the next one', () => {
    expect(quarterRange('2026-Q2')).toEqual({ start: new Date(2026, 3, 1), end: new Date(2026, 6, 1) });
  });

  it('ends Q4 at the start of the next year', () => {
    expect(quarterRange('2026-Q4').end).toEqual(new Date(2027, 0, 1));
  });
});

describe('isQuarterOver', () => {
  it('is over from the first moment of the next quarter, not on its own last day', () => {
    expect(isQuarterOver('2026-Q4', new Date(2026, 11, 31, 23, 59))).toBe(false);
    expect(isQuarterOver('2026-Q4', new Date(2027, 0, 1, 0, 0))).toBe(true);
  });
});

describe('quartersUpTo', () => {
  it('gives the quarter and the ones before it, oldest first', () => {
    expect(quartersUpTo('2026-Q4', 4)).toEqual(['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4']);
  });

  it('runs across the turn of the year', () => {
    expect(quartersUpTo('2027-Q1', 4)).toEqual(['2026-Q2', '2026-Q3', '2026-Q4', '2027-Q1']);
    expect(quartersUpTo('2027-Q2', 5)).toEqual(['2026-Q2', '2026-Q3', '2026-Q4', '2027-Q1', '2027-Q2']);
  });
});
