type Entry<V> = { value: V; expiresAt: number; refreshing: boolean };

type BackgroundErrorReport = (cache: string, key: unknown, err: unknown) => void;

// A background refresh runs outside any request, so its error has no request to land in.
// index.ts points this at stdout + app_log at startup; until then (and in tests) it is dropped.
let reportBackgroundError: BackgroundErrorReport = () => {};

/**
 * Where a failed background refresh of any cache is reported.
 * @param report gets the cache's label, the key and the error
 * Returns: nothing.
 */
export function reportBackgroundErrorsTo(report: BackgroundErrorReport): void {
  reportBackgroundError = report;
}

// Stale-while-revalidate, shared across every requester of a key: the first request pays for a
// live query; every request after that gets the cached value back immediately while a background
// refresh (fire-and-forget, at most one in flight per key) checks for changes, so the next request
// sees up-to-date numbers without ever blocking on the query itself. Without `ttlMs` every read
// starts a refresh; with it, only reads of an entry older than `ttlMs` do.
//
// After a change, markStale makes entries refresh on their next read (the reader still gets the
// last value right away) and clear drops them. Both bump `generation`: a load that started before
// that cannot store its result as fresh, because it may have read the data from before the change.
export class SwrCache<K, V> {
  private readonly entries = new Map<K, Entry<V>>();
  private generation = 0;

  constructor(
    private readonly label: string,
    private readonly ttlMs = 0
  ) {}

  // Pure cache read, no side effects: never triggers a recompute. For the frontend's frequent
  // "did it change yet?" poll, which must never itself cause work.
  peek(key: K): V | null {
    return this.entries.get(key)?.value ?? null;
  }

  // True while a background refresh of this key runs: a read soon after may return other numbers.
  isRefreshing(key: K): boolean {
    return this.entries.get(key)?.refreshing ?? false;
  }

  async get(key: K, load: () => Promise<V>): Promise<V> {
    const cached = this.entries.get(key);
    const startedAt = this.generation;

    if (cached) {
      if (Date.now() >= cached.expiresAt && !cached.refreshing) {
        cached.refreshing = true;
        load()
          .then(value => this.set(key, value, startedAt))
          .catch(err => {
            cached.refreshing = false;
            reportBackgroundError(this.label, key, err);
          });
      }
      return cached.value;
    }

    const value = await load();
    this.set(key, value, startedAt);
    return value;
  }

  // The next read of every matching entry gets the cached value and starts a refresh.
  markStale(match: (key: K) => boolean): void {
    this.generation += 1;
    for (const [key, entry] of this.entries) {
      if (match(key)) {
        entry.expiresAt = 0;
      }
    }
  }

  // Every matching entry is gone: its next read waits for a new load.
  clear(match: (key: K) => boolean): void {
    this.generation += 1;
    for (const key of [...this.entries.keys()]) {
      if (match(key)) {
        this.entries.delete(key);
      }
    }
  }

  private set(key: K, value: V, startedAt: number): void {
    const fresh = startedAt === this.generation;
    // Started before a clear: keep the old result out instead of putting it back.
    if (!fresh && !this.entries.has(key)) {
      return;
    }
    this.entries.set(key, { value, expiresAt: fresh ? Date.now() + this.ttlMs : 0, refreshing: false });
  }
}
