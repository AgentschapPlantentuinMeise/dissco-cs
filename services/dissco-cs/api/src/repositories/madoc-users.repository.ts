import { Pool } from 'pg';

import { appConfig } from '../config.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
type CacheEntry = { count: number; expiresAt: number; refreshing: boolean };

// Reads madoc-ts's own `user`/`site_permission` tables directly (read-only, reusing its DB
// user) instead of the Madoc gateway API. The gateway's /manage-site/users only lists users --
// it doesn't expose `is_active` -- so the API-based approach needed one extra HTTP request per
// non-automated user just to check that flag, which doesn't scale past a few hundred users.
export class MadocUsersRepository {
  private readonly pool: Pool;
  private readonly schemaRef: string;
  private readonly cache = new Map<number, CacheEntry>();

  constructor() {
    this.schemaRef = `"${appConfig.madocTsPostgresSchema}"`;

    this.pool = new Pool({
      host: appConfig.postgresHost,
      port: appConfig.postgresPort,
      user: appConfig.madocTsPostgresUser,
      password: appConfig.madocTsPostgresPassword,
      database: appConfig.postgresDatabase,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async fetchActiveVolunteerCount(siteId: number): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `
        SELECT COUNT(*) AS count
        FROM ${this.schemaRef}."user" u
        JOIN ${this.schemaRef}.site_permission sp ON u.id = sp.user_id
        WHERE sp.site_id = $1
          AND u.automated IS NOT TRUE
          AND u.is_active = true
      `,
      [siteId]
    );

    return Number(rows[0]?.count ?? 0);
  }

  // Stale-while-revalidate: the first request for a site pays for a live query, every request
  // after that gets the cached count back immediately while a background refresh (fire-and-forget)
  // keeps the cache from going stale for the next request.
  async getActiveVolunteerCount(siteId: number): Promise<number> {
    const cached = this.cache.get(siteId);

    if (cached) {
      if (Date.now() > cached.expiresAt && !cached.refreshing) {
        cached.refreshing = true;
        this.fetchActiveVolunteerCount(siteId)
          .then(count => this.cache.set(siteId, { count, expiresAt: Date.now() + CACHE_TTL_MS, refreshing: false }))
          .catch(err => {
            console.error('[madoc-users] background refresh failed', err);
            cached.refreshing = false;
          });
      }
      return cached.count;
    }

    const count = await this.fetchActiveVolunteerCount(siteId);
    this.cache.set(siteId, { count, expiresAt: Date.now() + CACHE_TTL_MS, refreshing: false });
    return count;
  }
}
