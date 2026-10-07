type Entry<V> = { value: V; expiresAt: number; refreshing: boolean };

// Stale-while-revalidate, shared across every requester of a key: the first request pays for a
// live query; every request after that gets the cached value back immediately while a background
// refresh (fire-and-forget, at most one in flight per key) checks for changes, so the next request
// sees up-to-date numbers without ever blocking on the query itself. Without `ttlMs` every read
// starts a refresh; with it, only reads of an entry older than `ttlMs` do.
export class SwrCache<K, V> {
  private readonly entries = new Map<K, Entry<V>>();

  constructor(
    private readonly label: string,
    private readonly ttlMs = 0
  ) {}

  // Pure cache read, no side effects: never triggers a recompute. For the frontend's frequent
  // "did it change yet?" poll, which must never itself cause work.
  peek(key: K): V | null {
    return this.entries.get(key)?.value ?? null;
  }

  async get(key: K, load: () => Promise<V>): Promise<V> {
    const cached = this.entries.get(key);

    if (cached) {
      if (Date.now() >= cached.expiresAt && !cached.refreshing) {
        cached.refreshing = true;
        load()
          .then(value => this.set(key, value))
          .catch(err => {
            console.error(`[${this.label}] background refresh failed`, key, err);
            cached.refreshing = false;
          });
      }
      return cached.value;
    }

    const value = await load();
    this.set(key, value);
    return value;
  }

  private set(key: K, value: V): void {
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs, refreshing: false });
  }
}
