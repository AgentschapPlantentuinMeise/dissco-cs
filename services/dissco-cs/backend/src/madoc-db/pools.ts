import { Pool } from 'pg';

import { appConfig } from '../config.js';

// Read-only connections to Madoc's own databases, shared by every madoc-db repository: one pool
// per schema, reusing madoc-ts's and tasks-api's own DB users. These are two separate schemas with
// no cross-schema grants (verified), so a query can never join across them -- callers that need
// both run one query per pool and join in application code.
export class MadocDbPools {
  readonly madocTs: Pool;
  readonly tasksApi: Pool;
  readonly madocTsSchema = `"${appConfig.madocTsPostgresSchema}"`;
  readonly tasksApiSchema = `"${appConfig.tasksApiPostgresSchema}"`;

  constructor() {
    this.madocTs = new Pool({
      host: appConfig.postgresHost,
      port: appConfig.postgresPort,
      user: appConfig.madocTsPostgresUser,
      password: appConfig.madocTsPostgresPassword,
      database: appConfig.postgresDatabase,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.tasksApi = new Pool({
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
    await Promise.all([this.madocTs.end(), this.tasksApi.end()]);
  }
}
