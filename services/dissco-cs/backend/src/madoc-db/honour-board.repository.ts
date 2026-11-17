import { MadocDbPools } from './pools.js';
import { SwrCache } from './swr-cache.js';
import { QuarterCount } from './honour-board.logic.js';
import { HonourBoardQuarterKey, isQuarterOver, quarterRange } from '@dissco-cs/shared-types';

// A closed quarter only changes when a reviewer rejects one of its tasks, so an hour is fresh enough.
const CLOSED_QUARTER_TTL_MS = 60 * 60 * 1000;

// Reads tasks-api's own `tasks` table directly (read-only, reusing its DB user) rather than the
// Madoc gateway API -- there's no per-assignee aggregation endpoint, and this table is already
// indexed for exactly this query (type, status, a GIN index on `context` for the site-scoping
// containment check). Site scoping matches how madoc-ts itself tags tasks, e.g. getSiteId() in
// queue/scheduler.ts: `context` is a jsonb array of URNs including `urn:madoc:site:<id>`.
export class HonourBoardRepository {
  // Cached per site and quarter (not per requesting user) -- the counts are the same for everyone
  // looking at that site, only "you" differs, and that's derived in-memory from the cached counts.
  private readonly runningCounts = new SwrCache<string, QuarterCount[]>('honour-board');
  private readonly closedCounts = new SwrCache<string, QuarterCount[]>('honour-board-closed', CLOSED_QUARTER_TTL_MS);

  constructor(private readonly pools: MadocDbPools) {}

  private async fetchCounts(siteId: number, start: Date, end: Date): Promise<QuarterCount[]> {
    // A task counts in the quarter it was claimed in (created_at), once it is submitted (2) or
    // accepted (3); a rejected task (-1) drops out by itself. Not modified_at: a review overwrites
    // it, which would move an accepted task into the quarter of its review. created_at never
    // changes, but Madoc reuses an open claim when the same user opens the object again
    // (getTaskFromClaim in create-resource-claim.ts), so this relies on saved drafts being released
    // after 48 hours; until then an old draft counts in the quarter it was started in.
    const { rows } = await this.pools.tasksApi.query<{
      assignee_id: string;
      assignee_name: string | null;
      task_count: string;
    }>(
      `
        SELECT assignee_id, assignee_name, COUNT(*) AS task_count
        FROM ${this.pools.tasksApiSchema}.tasks
        WHERE type = 'crowdsourcing-task'
          AND status IN (2, 3)
          AND created_at >= $2
          AND created_at < $3
          AND assignee_is_service IS NOT TRUE
          AND assignee_id IS NOT NULL
          AND context @> $1::jsonb
        GROUP BY assignee_id, assignee_name
      `,
      [JSON.stringify([`urn:madoc:site:${siteId}`]), start.toISOString(), end.toISOString()]
    );

    return rows.map(row => ({
      userUrn: row.assignee_id,
      name: row.assignee_name ?? row.assignee_id,
      count: Number(row.task_count),
    }));
  }

  private cacheFor(quarter: HonourBoardQuarterKey): SwrCache<string, QuarterCount[]> {
    return isQuarterOver(quarter, new Date()) ? this.closedCounts : this.runningCounts;
  }

  /**
   * The cached number of tasks per volunteer, without recalculating (for the frontend's polling).
   * Returns: null only when this quarter has never been cached yet for this site.
   */
  peekCounts(siteId: number, quarter: HonourBoardQuarterKey): QuarterCount[] | null {
    return this.cacheFor(quarter).peek(`${siteId}:${quarter}`);
  }

  /**
   * The number of tasks per volunteer in a quarter: from the cache, recalculated in the background.
   * Returns: an empty list for a quarter that has not started.
   */
  async getCounts(siteId: number, quarter: HonourBoardQuarterKey): Promise<QuarterCount[]> {
    const { start, end } = quarterRange(quarter);
    if (start > new Date()) {
      return [];
    }
    return this.cacheFor(quarter).get(`${siteId}:${quarter}`, () => this.fetchCounts(siteId, start, end));
  }
}
