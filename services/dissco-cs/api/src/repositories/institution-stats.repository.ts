import { Pool } from 'pg';

import { appConfig } from '../config.js';

export type InstitutionOverview = {
  volunteers: number;
  tasksCompleted: number;
  tasksTotal: number;
  projectsActive: number;
  projectsCompleted: number;
};

export type InstitutionProjectRow = { id: number; task_id: string; status: number };

const EMPTY_OVERVIEW: InstitutionOverview = {
  volunteers: 0,
  tasksCompleted: 0,
  tasksTotal: 0,
  projectsActive: 0,
  projectsCompleted: 0,
};

type CacheEntry = { overview: InstitutionOverview; refreshing: boolean };

// Same read-only direct-SQL approach as SiteTaskTotalsRepository, scoped to one institution's
// linked projects (dissco_cs.project_institution_links) instead of every project on the site.
// "Projecten afgerond" here means 100% transcribed (completed >= total manifests), not a Madoc
// project status -- so totals are computed per-project (GROUP BY) rather than as one site-wide
// sum, then classified in application code.
export class InstitutionStatsRepository {
  private readonly madocTsPool: Pool;
  private readonly tasksApiPool: Pool;
  private readonly madocTsSchemaRef: string;
  private readonly tasksApiSchemaRef: string;
  private readonly cache = new Map<string, CacheEntry>();

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

  // Resolves a set of project slugs (from dissco_cs's own institution links) to their Madoc
  // project rows -- shared with the institution honour-board route, which only needs task_id.
  async resolveProjects(siteId: number, projectSlugs: string[]): Promise<InstitutionProjectRow[]> {
    if (projectSlugs.length === 0) {
      return [];
    }

    const { rows } = await this.madocTsPool.query<InstitutionProjectRow>(
      `SELECT id, task_id, status FROM ${this.madocTsSchemaRef}.iiif_project WHERE site_id = $1 AND slug = ANY($2::text[])`,
      [siteId, projectSlugs]
    );

    return rows;
  }

  private async fetchOverview(siteId: number, projects: InstitutionProjectRow[]): Promise<InstitutionOverview> {
    if (projects.length === 0) {
      return EMPTY_OVERVIEW;
    }

    const projectIds = projects.map(p => p.id);
    const taskIds = projects.map(p => p.task_id);
    const projectsActive = projects.filter(p => p.status === 1).length;

    const [manifestsResult, completedResult, volunteersResult] = await Promise.all([
      this.madocTsPool.query<{ project_id: number; total: string }>(
        `
          SELECT p.id AS project_id, COUNT(*) AS total
          FROM ${this.madocTsSchemaRef}.iiif_project p
          JOIN ${this.madocTsSchemaRef}.iiif_derived_resource_items dri
            ON dri.resource_id = p.collection_id AND dri.site_id = p.site_id
          JOIN ${this.madocTsSchemaRef}.iiif_resource ir ON ir.id = dri.item_id
          WHERE p.id = ANY($1::int[]) AND ir.type = 'manifest'
          GROUP BY p.id
        `,
        [projectIds]
      ),
      this.tasksApiPool.query<{ root_task: string; completed: string }>(
        `
          SELECT root_task, COUNT(*) AS completed
          FROM (
            SELECT DISTINCT root_task, subject
            FROM ${this.tasksApiSchemaRef}.tasks
            WHERE type = 'crowdsourcing-task' AND status IN (2, 3) AND root_task = ANY($1::uuid[])
          ) distinct_per_project
          GROUP BY root_task
        `,
        [taskIds]
      ),
      this.tasksApiPool.query<{ count: string }>(
        `
          SELECT COUNT(DISTINCT assignee_id) AS count
          FROM ${this.tasksApiSchemaRef}.tasks
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

  peekOverview(siteId: number, institutionId: number): InstitutionOverview | null {
    return this.cache.get(`${siteId}:${institutionId}`)?.overview ?? null;
  }

  // Stale-while-revalidate, shared across every requester for an institution: the first request
  // pays for a live query; every request after that gets the cached overview back immediately
  // while a background refresh (fire-and-forget) checks for changes.
  async getOverview(siteId: number, institutionId: number, projectSlugs: string[]): Promise<InstitutionOverview> {
    const cacheKey = `${siteId}:${institutionId}`;
    const cached = this.cache.get(cacheKey);

    const recompute = async (): Promise<InstitutionOverview> => {
      const projects = await this.resolveProjects(siteId, projectSlugs);
      return this.fetchOverview(siteId, projects);
    };

    if (cached) {
      if (!cached.refreshing) {
        cached.refreshing = true;
        recompute()
          .then(overview => this.cache.set(cacheKey, { overview, refreshing: false }))
          .catch(err => {
            console.error('[institution-stats] background refresh failed', institutionId, err);
            cached.refreshing = false;
          });
      }
      return cached.overview;
    }

    const overview = await recompute();
    this.cache.set(cacheKey, { overview, refreshing: false });
    return overview;
  }
}
