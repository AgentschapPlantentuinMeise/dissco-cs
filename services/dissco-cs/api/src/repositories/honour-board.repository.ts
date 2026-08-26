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

export type HonourBoardLeaderboard = {
  today: HonourBoardPeriod;
  week: HonourBoardPeriod;
  month: HonourBoardPeriod;
  legend: HonourBoardPeriod;
};

type PeriodKey = 'today' | 'week' | 'month' | 'legend';
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

    let sinceClause = '';
    if (since) {
      params.push(since.toISOString());
      sinceClause = `AND modified_at >= $${params.length}`;
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
            AND status IN (2, 3)
            AND assignee_is_service IS NOT TRUE
            AND assignee_id IS NOT NULL
            AND ${scopeClause}
            ${sinceClause}
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

  // Pure cache read, no side effects: never triggers a recompute, unlike getLeaderboard. For the
  // frontend's frequent "did it change yet?" poll, which must never itself cause work. Returns
  // null only if nothing has ever been cached yet for this scope (all 4 periods must be present).
  private peek(scope: LeaderboardScope, userUrn: string | null): HonourBoardLeaderboard | null {
    const periods: PeriodKey[] = ['today', 'week', 'month', 'legend'];
    const rankings: Partial<Record<PeriodKey, RankedHonourBoardEntry[]>> = {};

    for (const period of periods) {
      const cached = this.cache.get(`${scopeCacheKey(scope)}:${period}`);
      if (!cached) {
        return null;
      }
      rankings[period] = cached.ranking;
    }

    return {
      today: this.toPeriod(rankings.today as RankedHonourBoardEntry[], userUrn),
      week: this.toPeriod(rankings.week as RankedHonourBoardEntry[], userUrn),
      month: this.toPeriod(rankings.month as RankedHonourBoardEntry[], userUrn),
      legend: this.toPeriod(rankings.legend as RankedHonourBoardEntry[], userUrn),
    };
  }

  private async getLeaderboardForScope(scope: LeaderboardScope, userUrn: string | null): Promise<HonourBoardLeaderboard> {
    const now = new Date();

    const [today, week, month, legend] = await Promise.all([
      this.getPeriodRanking(scope, 'today', startOfDay(now)),
      this.getPeriodRanking(scope, 'week', startOfWeek(now)),
      this.getPeriodRanking(scope, 'month', startOfMonth(now)),
      this.getPeriodRanking(scope, 'legend', null),
    ]);

    return {
      today: this.toPeriod(today, userUrn),
      week: this.toPeriod(week, userUrn),
      month: this.toPeriod(month, userUrn),
      legend: this.toPeriod(legend, userUrn),
    };
  }

  peekLeaderboard(siteId: number, userUrn: string | null): HonourBoardLeaderboard | null {
    return this.peek({ kind: 'site', siteId }, userUrn);
  }

  async getLeaderboard(siteId: number, userUrn: string | null): Promise<HonourBoardLeaderboard> {
    return this.getLeaderboardForScope({ kind: 'site', siteId }, userUrn);
  }

  peekInstitutionLeaderboard(siteId: number, institutionId: number, userUrn: string | null): HonourBoardLeaderboard | null {
    return this.peek({ kind: 'institution', siteId, institutionId, taskIds: [] }, userUrn);
  }

  async getInstitutionLeaderboard(
    siteId: number,
    institutionId: number,
    taskIds: string[],
    userUrn: string | null
  ): Promise<HonourBoardLeaderboard> {
    return this.getLeaderboardForScope({ kind: 'institution', siteId, institutionId, taskIds }, userUrn);
  }
}
