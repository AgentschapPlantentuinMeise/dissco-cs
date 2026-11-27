import { describe, expect, it, vi } from 'vitest';

import { SiteCache } from '../../../src/infrastructure/cache/site-cache.js';

const settle = () => new Promise(resolve => setImmediate(resolve));

describe('SiteCache', () => {
  it('keeps the same key apart per site', async () => {
    const cache = new SiteCache<string>('test', { ttlMs: 60_000 });
    expect(await cache.get(1, 'p', async () => 'site 1')).toBe('site 1');
    expect(await cache.get(2, 'p', async () => 'site 2')).toBe('site 2');
    expect(cache.peek(1, 'p')).toBe('site 1');
  });

  it('markStale refreshes every key of that site, and only of that site', async () => {
    const cache = new SiteCache<number>('test', { ttlMs: 60_000 });
    await cache.get(1, 'a', async () => 1);
    await cache.get(1, 'b', async () => 1);
    await cache.get(12, 'a', async () => 1);

    cache.markStale(1);
    const load = vi.fn(async () => 2);
    await cache.get(1, 'a', load);
    await cache.get(1, 'b', load);
    await cache.get(12, 'a', load);
    await settle();

    expect(load).toHaveBeenCalledTimes(2);
    expect(cache.peek(1, 'a')).toBe(2);
    expect(cache.peek(12, 'a')).toBe(1);
  });

  it('clear drops every key of that site, and only of that site', async () => {
    const cache = new SiteCache<number>('test', { ttlMs: 60_000 });
    await cache.get(1, 'a', async () => 1);
    await cache.get(2, 'a', async () => 1);

    cache.clear(1);
    expect(cache.peek(1, 'a')).toBeNull();
    expect(cache.peek(2, 'a')).toBe(1);
  });

  it('untilChanged never refreshes by itself, only after clear', async () => {
    const cache = new SiteCache<number>('test', { untilChanged: true });
    await cache.get(1, 'k', async () => 1);

    const load = vi.fn(async () => 2);
    expect(await cache.get(1, 'k', load)).toBe(1);
    await settle();
    expect(load).not.toHaveBeenCalled();

    cache.clear(1);
    expect(await cache.get(1, 'k', load)).toBe(2);
  });
});

