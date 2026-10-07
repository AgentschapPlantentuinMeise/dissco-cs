import { MadocDbPools } from './pools.js';
import { SwrCache } from './swr-cache.js';
import { HONOUR_BOARD_PERIODS, HonourBoardEntryDto, HonourBoardPeriodDto, HonourBoardPeriodKey } from '@dissco-cs/shared-types';

type RankedHonourBoardEntry = HonourBoardEntryDto;

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

export function isHonourBoardPeriod(value: string): value is HonourBoardPeriodKey {
  return (HONOUR_BOARD_PERIODS as string[]).includes(value);
}

function sinceForPeriod(period: HonourBoardPeriodKey, now: Date): Date | null {
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

// A ranking is either scoped to an entire site (context contains the site urn) or to one
// institution's projects (root_task in that institution's set of project task ids) -- same
// underlying tasks-api table, different WHERE clause and cache key.
type LeaderboardScope =
  | { kind: 'site'; siteId: number }
  | { kind: 'institution'; siteId: number; institutionId: number; taskIds: string[] };

function cacheKey(scope: LeaderboardScope, period: HonourBoardPeriodKey): string {
  const scopeKey = scope.kind === 'site' ? `site:${scope.siteId}` : `institution:${scope.siteId}:${scope.institutionId}`;
  return `${scopeKey}:${period}`;
}

// Reads tasks-api's own `tasks` table directly (read-only, reusing its DB user) rather than the
// Madoc gateway API -- there's no per-assignee aggregation endpoint, and this table is already
// indexed for exactly this query (type, status, a GIN index on `context` for the site-scoping
// containment check). Site scoping matches how madoc-ts itself tags tasks, e.g. getSiteId() in
// queue/scheduler.ts: `context` is a jsonb array of URNs including `urn:madoc:site:<id>`.
export class HonourBoardRepository {
  // Cached per scope+period (not per requesting user) -- the ranking is the same for everyone
  // looking at that site or institution, only "you" differs, and that's derived in-memory from
  // the cached ranking below rather than queried separately.
  private readonly rankings = new SwrCache<string, RankedHonourBoardEntry[]>('honour-board');

  constructor(private readonly pools: MadocDbPools) {}

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

    const { rows } = await this.pools.tasksApi.query<{
      assignee_id: string;
      assignee_name: string | null;
      completed_count: string;
      rank: string;
    }>(
      `
        WITH counts AS (
          SELECT assignee_id, assignee_name, COUNT(*) AS completed_count
          FROM ${this.pools.tasksApiSchema}.tasks
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

  private toPeriod(ranking: RankedHonourBoardEntry[], userUrn: string | null): HonourBoardPeriodDto {
    const top = ranking.filter(entry => entry.rank <= TOP_N);
    const you = userUrn ? (ranking.find(entry => entry.userUrn === userUrn) ?? null) : null;
    return { top, you };
  }

  // Returns null only if this period has never been cached yet for this scope.
  private peekPeriod(scope: LeaderboardScope, period: HonourBoardPeriodKey, userUrn: string | null): HonourBoardPeriodDto | null {
    const ranking = this.rankings.peek(cacheKey(scope, period));
    return ranking ? this.toPeriod(ranking, userUrn) : null;
  }

  private async getPeriod(scope: LeaderboardScope, period: HonourBoardPeriodKey, userUrn: string | null): Promise<HonourBoardPeriodDto> {
    const ranking = await this.rankings.get(cacheKey(scope, period), () =>
      this.fetchPeriodRanking(scope, sinceForPeriod(period, new Date()))
    );
    return this.toPeriod(ranking, userUrn);
  }

  peekSitePeriod(siteId: number, period: HonourBoardPeriodKey, userUrn: string | null): HonourBoardPeriodDto | null {
    return this.peekPeriod({ kind: 'site', siteId }, period, userUrn);
  }

  async getSitePeriod(siteId: number, period: HonourBoardPeriodKey, userUrn: string | null): Promise<HonourBoardPeriodDto> {
    return this.getPeriod({ kind: 'site', siteId }, period, userUrn);
  }

  peekInstitutionPeriod(siteId: number, institutionId: number, period: HonourBoardPeriodKey, userUrn: string | null): HonourBoardPeriodDto | null {
    return this.peekPeriod({ kind: 'institution', siteId, institutionId, taskIds: [] }, period, userUrn);
  }

  async getInstitutionPeriod(
    siteId: number,
    institutionId: number,
    taskIds: string[],
    period: HonourBoardPeriodKey,
    userUrn: string | null
  ): Promise<HonourBoardPeriodDto> {
    return this.getPeriod({ kind: 'institution', siteId, institutionId, taskIds }, period, userUrn);
  }
}
