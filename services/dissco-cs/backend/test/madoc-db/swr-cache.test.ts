import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SwrCache } from '../../src/madoc-db/swr-cache.js';

// A load function that answers 1, 2, 3, ... and can be told to fail or to hang.
function counter() {
  let calls = 0;
  let mode: 'ok' | 'fail' | 'hang' = 'ok';
  const load = vi.fn(async () => {
    calls += 1;
    if (mode === 'fail') throw new Error('load failed');
    if (mode === 'hang') return new Promise<number>(() => {});
    return calls;
  });
  return { load, setMode: (next: typeof mode) => (mode = next) };
}

// Lets a background refresh (a promise nobody awaits) finish.
const settle = () => new Promise(resolve => setImmediate(resolve));

describe('SwrCache', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads on the first request and waits for it', async () => {
    const cache = new SwrCache<string, number>('test');
    const { load } = counter();
    expect(await cache.get('k', load)).toBe(1);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('answers later requests from the cache and refreshes in the background', async () => {
    const cache = new SwrCache<string, number>('test');
    const { load } = counter();
    await cache.get('k', load);

    expect(await cache.get('k', load)).toBe(1);
    await settle();
    expect(await cache.get('k', load)).toBe(2);
  });

  it('does not refresh before ttlMs has passed', async () => {
    const cache = new SwrCache<string, number>('test', 1000);
    const { load } = counter();
    await cache.get('k', load);

    vi.advanceTimersByTime(999);
    await cache.get('k', load);
    expect(load).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await cache.get('k', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('runs at most one background refresh per key at a time', async () => {
    const cache = new SwrCache<string, number>('test');
    const { load, setMode } = counter();
    await cache.get('k', load);

    setMode('hang');
    await cache.get('k', load);
    await cache.get('k', load);
    await cache.get('k', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keeps the old value when a refresh fails, and tries again on the next request', async () => {
    const cache = new SwrCache<string, number>('test');
    const { load, setMode } = counter();
    await cache.get('k', load);

    setMode('fail');
    await cache.get('k', load);
    await settle();
    expect(await cache.get('k', load)).toBe(1);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('isRefreshing is true only while a background refresh runs', async () => {
    const cache = new SwrCache<string, number>('test');
    expect(cache.isRefreshing('k')).toBe(false);

    await cache.get('k', async () => 1);
    expect(cache.isRefreshing('k')).toBe(false);

    // A refresh that finishes only when the test says so, like a slow database query.
    let finish: (value: number) => void = () => {};
    await cache.get('k', () => new Promise<number>(resolve => (finish = resolve)));
    expect(cache.isRefreshing('k')).toBe(true);
    finish(2);
    await settle();
    expect(cache.isRefreshing('k')).toBe(false);
    expect(cache.peek('k')).toBe(2);
  });

  it('isRefreshing turns false again when a refresh fails', async () => {
    const cache = new SwrCache<string, number>('test');
    const { load, setMode } = counter();
    await cache.get('k', load);

    setMode('fail');
    await cache.get('k', load);
    expect(cache.isRefreshing('k')).toBe(true);
    await settle();
    expect(cache.isRefreshing('k')).toBe(false);
  });

  it('peek never loads', async () => {
    const cache = new SwrCache<string, number>('test');
    const { load } = counter();
    expect(cache.peek('k')).toBeNull();

    await cache.get('k', load);
    expect(cache.peek('k')).toBe(1);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
