import { Pool } from 'pg';

import { appConfig } from '../config.js';

export type SiteTaskTotals = { completed: number; total: number };

type CacheEntry = { totals: SiteTaskTotals; refreshing: boolean };

// Reads madoc-ts's and tasks-api's own tables directly (read-only, reusing their DB users)
// instead of the Madoc gateway API -- one HTTP call (with a transient-failure risk) per project
// summed together made the total visibly flicker whenever a different subset of projects failed
// on a given recompute. These are two separate schemas with no cross-schema grants (verified),
// hence two pools joined in application code rather than one query.
export class SiteTaskTotalsRepository {
  private readonly madocTsPool: Pool;
  private readonly tasksApiPool: Pool;
  private readonly madocTsSchemaRef: string;
  private readonly tasksApiSchemaRef: string;
  private readonly cache = new Map<number, CacheEntry>();

  constructor() {
    this.madocTsSchemaRef = `"${appConfig.madocTsPostgresSchema}"`;
    this.tasksApiSchemaRef = `"${appConfig.tasksApiPostgresSchema}"`;

    this.madocTsPool = new Pool({
      host: appConfig.postgresHost,
      port: appConfig.postgresPort,
      user: appConfig.madocTsPostgresUser,
      password: appConfig.madocTsPostgresPassword,
      database: appConfig.postgresDatabase,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.tasksApiPool = new Pool({
      host: appConfig.postgresHost,
      port: appConfig.postgresPort,
      user: appConfig.tasksApiPostgresUser,
      password: appConfig.tasksApiPostgresPassword,
      database: appConfig.postgresDatabase,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  async close(): Promise<void> {
    await Promise.all([this.madocTsPool.end(), this.tasksApiPool.end()]);
  }

  private async fetchTotals(siteId: number): Promise<SiteTaskTotals> {
    const projectRows = await this.madocTsPool.query<{ task_id: string }>(
      `SELECT task_id FROM ${this.madocTsSchemaRef}.iiif_project WHERE site_id = $1`,
      [siteId]
    );
    const rootTaskIds = projectRows.rows.map(row => row.task_id);

    const [totalResult, completedResult] = await Promise.all([
      this.madocTsPool.query<{ total: string }>(
        `
          SELECT COUNT(*) AS total
          FROM ${this.madocTsSchemaRef}.iiif_project p
          JOIN ${this.madocTsSchemaRef}.iiif_derived_resource_items dri
            ON dri.resource_id = p.collection_id AND dri.site_id = p.site_id
          JOIN ${this.madocTsSchemaRef}.iiif_resource ir ON ir.id = dri.item_id
          WHERE p.site_id = $1 AND ir.type = 'manifest'
        `,
        [siteId]
      ),
      rootTaskIds.length === 0
        ? Promise.resolve({ rows: [{ completed: '0' }] })
        : this.tasksApiPool.query<{ completed: string }>(
            `
              SELECT COUNT(*) AS completed
              FROM (
                SELECT DISTINCT root_task, subject
                FROM ${this.tasksApiSchemaRef}.tasks
                WHERE type = 'crowdsourcing-task' AND status IN (2, 3) AND root_task = ANY($1::uuid[])
              ) distinct_per_project
            `,
            [rootTaskIds]
          ),
    ]);

    return {
      total: Number(totalResult.rows[0]?.total ?? 0),
      completed: Number(completedResult.rows[0]?.completed ?? 0),
    };
  }

  // Pure cache read, no side effects: never triggers a recompute. For the frontend's frequent
  // "did it change yet?" poll, which must never itself cause work.
  peekTotals(siteId: number): SiteTaskTotals | null {
    return this.cache.get(siteId)?.totals ?? null;
  }

  // Stale-while-revalidate, shared across every requester for a site: the first request pays for
  // a live query; every request after that gets the cached totals back immediately while a
  // background refresh (fire-and-forget) checks for changes, so the next request sees up-to-date
  // numbers without ever blocking on the query itself.
  async getTotals(siteId: number): Promise<SiteTaskTotals> {
    const cached = this.cache.get(siteId);

    if (cached) {
      if (!cached.refreshing) {
        cached.refreshing = true;
        this.fetchTotals(siteId)
          .then(totals => this.cache.set(siteId, { totals, refreshing: false }))
          .catch(err => {
            console.error('[site-task-totals] background refresh failed', siteId, err);
            cached.refreshing = false;
          });
      }
      return cached.totals;
    }

    const totals = await this.fetchTotals(siteId);
    this.cache.set(siteId, { totals, refreshing: false });
    return totals;
  }
}
