import { MadocDbPools } from './pools.js';
import { SwrCache } from './swr-cache.js';
import { InstitutionStatsDto, SiteStatsDto } from '@dissco-cs/shared-types';

export type InstitutionProjectRow = { id: number; task_id: string; status: number };

type SiteTaskTotals = { completed: number; total: number };

const VOLUNTEERS_CACHE_TTL_MS = 5 * 60 * 1000;

const EMPTY_INSTITUTION_STATS: InstitutionStatsDto = {
  volunteers: 0,
  tasksCompleted: 0,
  tasksTotal: 0,
  projectsActive: 0,
  projectsCompleted: 0,
};

// Counters for the whole site or one institution, read directly from madoc-ts's and tasks-api's
// own tables instead of the Madoc gateway API -- one HTTP call (with a transient-failure risk) per
// project summed together made the total visibly flicker whenever a different subset of projects
// failed on a given recompute, and the gateway's /manage-site/users doesn't expose `is_active`.
//
// Note: "volunteers" deliberately means two different things per scope. For the site it is every
// active, non-automated user with a site permission; for an institution it is every distinct
// assignee with at least one finished task on that institution's projects. Aligning the two is a
// content decision, not a refactor.
export class StatsRepository {
  private readonly siteVolunteers = new SwrCache<number, number>('stats:site-volunteers', VOLUNTEERS_CACHE_TTL_MS);
  private readonly siteTaskTotals = new SwrCache<number, SiteTaskTotals>('stats:site-task-totals');
  private readonly institutionStats = new SwrCache<string, InstitutionStatsDto>('stats:institution');

  constructor(private readonly pools: MadocDbPools) {}

  // ---- site ----

  async getSite(siteId: number): Promise<SiteStatsDto> {
    const [volunteers, taskTotals] = await Promise.all([
      this.getSiteVolunteers(siteId),
      this.siteTaskTotals.get(siteId, () => this.fetchSiteTaskTotals(siteId)),
    ]);
    return { volunteers, tasksCompleted: taskTotals.completed, tasksTotal: taskTotals.total };
  }

  // For the /current poll: task totals are read from cache only (falling back to a live query only
  // if nothing was ever cached); volunteers already refresh at most every VOLUNTEERS_CACHE_TTL_MS.
  async getSiteCurrent(siteId: number): Promise<SiteStatsDto> {
    const [volunteers, taskTotals] = await Promise.all([
      this.getSiteVolunteers(siteId),
      this.siteTaskTotals.peek(siteId) ?? this.siteTaskTotals.get(siteId, () => this.fetchSiteTaskTotals(siteId)),
    ]);
    return { volunteers, tasksCompleted: taskTotals.completed, tasksTotal: taskTotals.total };
  }

  private getSiteVolunteers(siteId: number): Promise<number> {
    return this.siteVolunteers.get(siteId, () => this.fetchSiteVolunteers(siteId));
  }

  private async fetchSiteVolunteers(siteId: number): Promise<number> {
    const { rows } = await this.pools.madocTs.query<{ count: string }>(
      `
        SELECT COUNT(*) AS count
        FROM ${this.pools.madocTsSchema}."user" u
        JOIN ${this.pools.madocTsSchema}.site_permission sp ON u.id = sp.user_id
        WHERE sp.site_id = $1
          AND u.automated IS NOT TRUE
          AND u.is_active = true
      `,
      [siteId]
    );

    return Number(rows[0]?.count ?? 0);
  }

  private async fetchSiteTaskTotals(siteId: number): Promise<SiteTaskTotals> {
    const projectRows = await this.pools.madocTs.query<{ task_id: string }>(
      `SELECT task_id FROM ${this.pools.madocTsSchema}.iiif_project WHERE site_id = $1`,
      [siteId]
    );
    const rootTaskIds = projectRows.rows.map(row => row.task_id);

    const [totalResult, completedResult] = await Promise.all([
      this.pools.madocTs.query<{ total: string }>(
        `
          SELECT COUNT(*) AS total
          FROM ${this.pools.madocTsSchema}.iiif_project p
          JOIN ${this.pools.madocTsSchema}.iiif_derived_resource_items dri
            ON dri.resource_id = p.collection_id AND dri.site_id = p.site_id
          JOIN ${this.pools.madocTsSchema}.iiif_resource ir ON ir.id = dri.item_id
          WHERE p.site_id = $1 AND ir.type = 'manifest'
        `,
        [siteId]
      ),
      rootTaskIds.length === 0
        ? Promise.resolve({ rows: [{ completed: '0' }] })
        : this.pools.tasksApi.query<{ completed: string }>(
            `
              SELECT COUNT(*) AS completed
              FROM (
                SELECT DISTINCT root_task, subject
                FROM ${this.pools.tasksApiSchema}.tasks
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

  // ---- institution ----

  // Resolves a set of project slugs (from dissco_cs's own institution links) to their Madoc
  // project rows -- also used by the institution honour-board route, which only needs task_id.
  async resolveProjects(siteId: number, projectSlugs: string[]): Promise<InstitutionProjectRow[]> {
    if (projectSlugs.length === 0) {
      return [];
    }

    const { rows } = await this.pools.madocTs.query<InstitutionProjectRow>(
      `SELECT id, task_id, status FROM ${this.pools.madocTsSchema}.iiif_project WHERE site_id = $1 AND slug = ANY($2::text[])`,
      [siteId, projectSlugs]
    );

    return rows;
  }

  peekInstitution(siteId: number, institutionId: number): InstitutionStatsDto | null {
    return this.institutionStats.peek(`${siteId}:${institutionId}`);
  }

  async getInstitution(siteId: number, institutionId: number, projectSlugs: string[]): Promise<InstitutionStatsDto> {
    return this.institutionStats.get(`${siteId}:${institutionId}`, async () => {
      const projects = await this.resolveProjects(siteId, projectSlugs);
      return this.fetchInstitutionStats(projects);
    });
  }

  // Scoped to one institution's linked projects (dissco_cs.project_institution_links) instead of
  // every project on the site. "Projects completed" here means 100% transcribed (completed >= total
  // manifests), not a Madoc project status -- so totals are computed per project (GROUP BY) rather
  // than as one site-wide sum, then classified in application code.
  private async fetchInstitutionStats(projects: InstitutionProjectRow[]): Promise<InstitutionStatsDto> {
    if (projects.length === 0) {
      return EMPTY_INSTITUTION_STATS;
    }

    const projectIds = projects.map(p => p.id);
    const taskIds = projects.map(p => p.task_id);
    const projectsActive = projects.filter(p => p.status === 1).length;

    const [manifestsResult, completedResult, volunteersResult] = await Promise.all([
      this.pools.madocTs.query<{ project_id: number; total: string }>(
        `
          SELECT p.id AS project_id, COUNT(*) AS total
          FROM ${this.pools.madocTsSchema}.iiif_project p
          JOIN ${this.pools.madocTsSchema}.iiif_derived_resource_items dri
            ON dri.resource_id = p.collection_id AND dri.site_id = p.site_id
          JOIN ${this.pools.madocTsSchema}.iiif_resource ir ON ir.id = dri.item_id
          WHERE p.id = ANY($1::int[]) AND ir.type = 'manifest'
          GROUP BY p.id
        `,
        [projectIds]
      ),
      this.pools.tasksApi.query<{ root_task: string; completed: string }>(
        `
          SELECT root_task, COUNT(*) AS completed
          FROM (
            SELECT DISTINCT root_task, subject
            FROM ${this.pools.tasksApiSchema}.tasks
            WHERE type = 'crowdsourcing-task' AND status IN (2, 3) AND root_task = ANY($1::uuid[])
          ) distinct_per_project
          GROUP BY root_task
        `,
        [taskIds]
      ),
      this.pools.tasksApi.query<{ count: string }>(
        `
          SELECT COUNT(DISTINCT assignee_id) AS count
          FROM ${this.pools.tasksApiSchema}.tasks
          WHERE type = 'crowdsourcing-task' AND status IN (2, 3)
            AND assignee_is_service IS NOT TRUE AND assignee_id IS NOT NULL
            AND root_task = ANY($1::uuid[])
        `,
        [taskIds]
      ),
    ]);

    const totalByProjectId = new Map(manifestsResult.rows.map(row => [row.project_id, Number(row.total)]));
    const completedByTaskId = new Map(completedResult.rows.map(row => [row.root_task, Number(row.completed)]));

    let tasksTotal = 0;
    let tasksCompleted = 0;
    let projectsCompleted = 0;

    for (const project of projects) {
      const total = totalByProjectId.get(project.id) ?? 0;
      const completed = completedByTaskId.get(project.task_id) ?? 0;
      tasksTotal += total;
      tasksCompleted += completed;
      if (total > 0 && completed >= total) {
        projectsCompleted += 1;
      }
    }

    return {
      volunteers: Number(volunteersResult.rows[0]?.count ?? 0),
      tasksCompleted,
      tasksTotal,
      projectsActive,
      projectsCompleted,
    };
  }
}
