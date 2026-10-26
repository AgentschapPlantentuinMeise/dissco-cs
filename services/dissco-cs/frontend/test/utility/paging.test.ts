import { describe, expect, it } from 'vitest';

import { pageCount, pageOfItem, pageSlice, parsePageParam } from '../../src/utility/paging';

const items = Array.from({ length: 45 }, (_, i) => i + 1);

describe('pageCount', () => {
  it('rounds up, and is at least one', () => {
    expect(pageCount(45, 20)).toBe(3);
    expect(pageCount(40, 20)).toBe(2);
    expect(pageCount(0, 20)).toBe(1);
  });
});

describe('pageSlice', () => {
  it('gives the items of one page, the last one partly filled', () => {
    expect(pageSlice(items, 1, 20)).toEqual(items.slice(0, 20));
    expect(pageSlice(items, 3, 20)).toEqual([41, 42, 43, 44, 45]);
    expect(pageSlice(items, 4, 20)).toEqual([]);
  });
});

describe('pageOfItem', () => {
  it('finds the page an item is on', () => {
    expect(pageOfItem(items, n => n === 1, 20)).toBe(1);
    expect(pageOfItem(items, n => n === 20, 20)).toBe(1);
    expect(pageOfItem(items, n => n === 21, 20)).toBe(2);
    expect(pageOfItem(items, n => n === 45, 20)).toBe(3);
  });

  it('gives null when the item is not in the list', () => {
    expect(pageOfItem(items, n => n === 99, 20)).toBeNull();
  });
});

describe('parsePageParam', () => {
  it('reads a page from the query string', () => {
    expect(parsePageParam('3')).toBe(3);
  });

  it('falls back to page 1 for a missing or invalid value', () => {
    expect(parsePageParam(null)).toBe(1);
    expect(parsePageParam('')).toBe(1);
    expect(parsePageParam('0')).toBe(1);
    expect(parsePageParam('-2')).toBe(1);
    expect(parsePageParam('2.5')).toBe(1);
    expect(parsePageParam('abc')).toBe(1);
  });
});
