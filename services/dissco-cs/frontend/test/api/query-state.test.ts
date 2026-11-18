import { describe, expect, it } from 'vitest';
import { failedToLoad, loadState } from '../../src/api/query-state';

const pending = { data: undefined, errorUpdateCount: 0 };
const failed = { data: undefined, errorUpdateCount: 1 };
const loaded = { data: ['x'], errorUpdateCount: 0 };
// Had data, then a refetch failed: the data stays.
const staleAfterError = { data: ['x'], errorUpdateCount: 2 };

describe('failedToLoad', () => {
  it('is true only for a query that failed and has no data', () => {
    expect(failedToLoad(failed)).toBe(true);
    expect(failedToLoad(pending)).toBe(false);
    expect(failedToLoad(staleAfterError)).toBe(false);
  });
});

describe('loadState', () => {
  it('is loading while a query has no data yet', () => {
    expect(loadState(pending)).toBe('loading');
    expect(loadState(loaded, pending)).toBe('loading');
  });

  it('is failed as soon as one query failed, also while another still loads', () => {
    expect(loadState(failed)).toBe('failed');
    expect(loadState(pending, failed)).toBe('failed');
    expect(loadState(loaded, failed)).toBe('failed');
  });

  it('is ready when every query has data, also after a failed refetch', () => {
    expect(loadState(loaded)).toBe('ready');
    expect(loadState(loaded, staleAfterError)).toBe('ready');
  });

  it('keeps data that is falsy but defined as loaded', () => {
    expect(loadState({ data: 0, errorUpdateCount: 0 }, { data: null, errorUpdateCount: 0 })).toBe('ready');
  });
});
