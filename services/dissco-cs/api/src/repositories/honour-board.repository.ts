import { Pool } from 'pg';

import { appConfig } from '../config.js';

export type HonourBoardEntry = { userUrn: string; name: string; count: number };
export type RankedHonourBoardEntry = HonourBoardEntry & { rank: number };
export type HonourBoardPeriod = { top: RankedHonourBoardEntry[]; you: RankedHonourBoardEntry | null };

const TOP_N = 3;

function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeek(now: Date): Date {
  const start = startOfDay(now);
  const mondayOffset = (start.getDay() + 6) % 7; // getDay(): 0=Sunday..6=Saturday -> 0=Monday..6=Sunday
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export type PeriodKey = 'today' | 'week' | 'month' | 'legend';
export const HONOUR_BOARD_PERIODS: PeriodKey[] = ['today', 'week', 'month', 'legend'];
export function isHonourBoardPeriod(value: string): value is PeriodKey {
  return (HONOUR_BOARD_PERIODS as string[]).includes(value);
}

function sinceForPeriod(period: PeriodKey, now: Date): Date | null {
  switch (period) {
    case 'today':
      return startOfDay(now);
    case 'week':
      return startOfWeek(now);
    case 'month':
      return startOfMonth(now);
    case 'legend':
      return null;
  }
}

type PeriodRankingCacheEntry = { ranking: RankedHonourBoardEntry[]; refreshing: boolean };

// A ranking is either scoped to an entire site (context contains the site urn) or to one
// institution's projects (root_task in that institution's set of project task ids) -- same
// underlying tasks-api table, different WHERE clause and cache key.
type LeaderboardScope =
  | { kind: 'site'; siteId: number }
  | { kind: 'institution'; siteId: number; institutionId: number; taskIds: string[] };

function scopeCacheKey(scope: LeaderboardScope): string {
  return scope.kind === 'site' ? `site:${scope.siteId}` : `institution:${scope.siteId}:${scope.institutionId}`;
}

// Reads tasks-api's own `tasks` table directly (read-only, reusing its DB user) rather than the
// Madoc gateway API -- there's no per-assignee aggregation endpoint, and this table is already
// indexed for exactly this query (type, status, a GIN index on `context` for the site-scoping
// containment check). Site scoping matches how madoc-ts itself tags tasks, e.g. getSiteId() in
// queue/scheduler.ts: `context` is a jsonb array of URNs including `urn:madoc:site:<id>`.
export class HonourBoardRepository {
  private readonly pool: Pool;
  private readonly schemaRef: string;

  // Cached per scope+period (not per requesting user) -- the ranking is the same for everyone
  // looking at that site or institution, only "you" differs, and that's derived in-memory from
  // the cached ranking below rather than queried separately.
  private readonly cache = new Map<string, PeriodRankingCacheEntry>();

  constructor() {
    this.schemaRef = `"${appConfig.tasksApiPostgresSchema}"`;

    this.pool = new Pool({
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
    await this.pool.end();
  }

  private async fetchPeriodRanking(scope: LeaderboardScope, since: Date | null): Promise<RankedHonourBoardEntry[]> {
    if (scope.kind === 'institution' && scope.taskIds.length === 0) {
      return [];
    }

    const params: unknown[] = [scope.kind === 'site' ? JSON.stringify([`urn:madoc:site:${scope.siteId}`]) : scope.taskIds];
    const scopeClause = scope.kind === 'site' ? `context @> $1::jsonb` : `root_task = ANY($1::uuid[])`;

    // A status-3 (reviewed) row only counts within a bounded period (today/week/month) if it was
    // also *created* (claimed/started) within that same period -- otherwise a reviewer approving
    // an old submission bumps modified_at into the period and misattributes it to the original
    // assignee, who may have done the actual work long before. Status-2 (submitted, not yet
    // reviewed) rows are still bounded on modified_at, since submitting is what sets that
    // timestamp. Legend (since = null) has no period to leak across, so it keeps the original
    // unconditional check.
    let statusClause = 'status IN (2, 3)';
    if (since) {
      params.push(since.toISOString());
      const sinceParam = `$${params.length}`;
      statusClause = `((status = 2 AND modified_at >= ${sinceParam}) OR (status = 3 AND created_at >= ${sinceParam}))`;
    }

    const { rows } = await this.pool.query<{
      assignee_id: string;
      assignee_name: string | null;
      completed_count: string;
      rank: string;
    }>(
      `
        WITH counts AS (
          SELECT assignee_id, assignee_name, COUNT(*) AS completed_count
          FROM ${this.schemaRef}.tasks
          WHERE type = 'crowdsourcing-task'
            AND ${statusClause}
            AND assignee_is_service IS NOT TRUE
            AND assignee_id IS NOT NULL
            AND ${scopeClause}
          GROUP BY assignee_id, assignee_name
        )
        SELECT *, DENSE_RANK() OVER (ORDER BY completed_count DESC) AS rank
        FROM counts
        ORDER BY rank ASC
      `,
      params
    );

    return rows.map(row => ({
      userUrn: row.assignee_id,
      name: row.assignee_name ?? row.assignee_id,
      count: Number(row.completed_count),
      rank: Number(row.rank),
    }));
  }

  // Stale-while-revalidate, shared across every requester for a scope+period: the first request
  // pays for a live query; every request after that gets the cached ranking back immediately
  // while a background refresh (fire-and-forget) checks for changes, so the next request sees
  // up-to-date numbers without ever blocking on the query itself.
  private async getPeriodRanking(scope: LeaderboardScope, period: PeriodKey, since: Date | null): Promise<RankedHonourBoardEntry[]> {
    const cacheKey = `${scopeCacheKey(scope)}:${period}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      if (!cached.refreshing) {
        cached.refreshing = true;
        this.fetchPeriodRanking(scope, since)
          .then(ranking => this.cache.set(cacheKey, { ranking, refreshing: false }))
          .catch(err => {
            console.error('[honour-board] background refresh failed', period, err);
            cached.refreshing = false;
          });
      }
      return cached.ranking;
    }

    const ranking = await this.fetchPeriodRanking(scope, since);
    this.cache.set(cacheKey, { ranking, refreshing: false });
    return ranking;
  }

  private toPeriod(ranking: RankedHonourBoardEntry[], userUrn: string | null): HonourBoardPeriod {
    const top = ranking.filter(entry => entry.rank <= TOP_N);
    const you = userUrn ? (ranking.find(entry => entry.userUrn === userUrn) ?? null) : null;
    return { top, you };
  }

  // Pure cache read, no side effects: never triggers a recompute, unlike getPeriod. For the
  // frontend's frequent "did it change yet?" poll, which must never itself cause work. Returns
  // null only if this period has never been cached yet for this scope.
  private peekPeriod(scope: LeaderboardScope, period: PeriodKey, userUrn: string | null): HonourBoardPeriod | null {
    const cached = this.cache.get(`${scopeCacheKey(scope)}:${period}`);
    return cached ? this.toPeriod(cached.ranking, userUrn) : null;
  }

  private async getPeriod(scope: LeaderboardScope, period: PeriodKey, userUrn: string | null): Promise<HonourBoardPeriod> {
    const ranking = await this.getPeriodRanking(scope, period, sinceForPeriod(period, new Date()));
    return this.toPeriod(ranking, userUrn);
  }

  peekSitePeriod(siteId: number, period: PeriodKey, userUrn: string | null): HonourBoardPeriod | null {
    return this.peekPeriod({ kind: 'site', siteId }, period, userUrn);
  }

  async getSitePeriod(siteId: number, period: PeriodKey, userUrn: string | null): Promise<HonourBoardPeriod> {
    return this.getPeriod({ kind: 'site', siteId }, period, userUrn);
  }

  peekInstitutionPeriod(siteId: number, institutionId: number, period: PeriodKey, userUrn: string | null): HonourBoardPeriod | null {
    return this.peekPeriod({ kind: 'institution', siteId, institutionId, taskIds: [] }, period, userUrn);
  }

  async getInstitutionPeriod(
    siteId: number,
    institutionId: number,
    taskIds: string[],
    period: PeriodKey,
    userUrn: string | null
  ): Promise<HonourBoardPeriod> {
    return this.getPeriod({ kind: 'institution', siteId, institutionId, taskIds }, period, userUrn);
  }
}
