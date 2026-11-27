import { SwrCache } from './swr-cache.js';

// A SwrCache whose every entry belongs to one site, so a change on a site can mark or drop
// everything of that site at once. The key within a site is free (a project id, 'all', ...).
export class SiteCache<V> {
  private readonly cache: SwrCache<string, V>;

  constructor(label: string, options: { ttlMs: number }) {
    this.cache = new SwrCache<string, V>(label, options.ttlMs);
  }

  get(siteId: number, key: string, load: () => Promise<V>): Promise<V> {
    return this.cache.get(entryKey(siteId, key), load);
  }

  peek(siteId: number, key: string): V | null {
    return this.cache.peek(entryKey(siteId, key));
  }

  isRefreshing(siteId: number, key: string): boolean {
    return this.cache.isRefreshing(entryKey(siteId, key));
  }

  // After a change on the site: its next reads still answer at once, and start a refresh.
  markStale(siteId: number): void {
    this.cache.markStale(key => key.startsWith(sitePrefix(siteId)));
  }

  clear(siteId: number): void {
    this.cache.clear(key => key.startsWith(sitePrefix(siteId)));
  }
}

function sitePrefix(siteId: number): string {
  return `${siteId}:`;
}

function entryKey(siteId: number, key: string): string {
  return `${sitePrefix(siteId)}${key}`;
}
