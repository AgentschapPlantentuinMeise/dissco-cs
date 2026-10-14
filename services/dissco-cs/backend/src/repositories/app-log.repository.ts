import { Pool } from 'pg';

export type AppLogEntry = {
  level: 'error';
  source: 'backend' | 'frontend';
  siteId?: number;
  userId?: number;
  method?: string;
  path?: string;
  status?: number;
  message: string;
  stack?: string;
  details?: Record<string, unknown>;
};

export class AppLogRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string
  ) {}

  // Never throws: logging an error must never break the request it belongs to. If the database
  // itself is the problem, the entry still ends up in stdout.
  async record(entry: AppLogEntry): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO ${this.schemaRef}.app_log
           (level, source, site_id, user_id, method, path, status, message, stack, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          entry.level,
          entry.source,
          entry.siteId ?? null,
          entry.userId ?? null,
          entry.method ?? null,
          entry.path ?? null,
          entry.status ?? null,
          entry.message,
          entry.stack ?? null,
          entry.details ? JSON.stringify(entry.details) : null,
        ]
      );
    } catch (err) {
      console.error('[app-log] could not store entry', entry, err);
    }
  }
}
