import { Pool } from 'pg';

import { appConfig } from '../config.js';
import { runMigrations } from './migrations.js';
import { AnnouncementsRepository } from '../repositories/announcements.repository.js';
import { ForumRepository } from '../repositories/forum.repository.js';
import { InstitutionsRepository } from '../repositories/institutions.repository.js';
import { ManualsRepository } from '../repositories/manuals.repository.js';
import { FeedbackRepository } from '../repositories/feedback.repository.js';
import { NavItemsRepository } from '../repositories/nav-items.repository.js';

// Our own Postgres database: one connection pool, shared by every repository created here.
export class DisscoCSDatabase {
  readonly forum: ForumRepository;
  readonly navItems: NavItemsRepository;
  readonly announcements: AnnouncementsRepository;
  readonly institutions: InstitutionsRepository;
  readonly manuals: ManualsRepository;
  readonly feedback: FeedbackRepository;

  private readonly pool: Pool;
  private readonly schemaRef: string;

  constructor() {
    this.schemaRef = `"${appConfig.postgresSchema}"`;

    this.pool = new Pool({
      host: appConfig.postgresHost,
      port: appConfig.postgresPort,
      user: appConfig.postgresUser,
      password: appConfig.postgresPassword,
      database: appConfig.postgresDatabase,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.pool.on('connect', client => {
      void client.query(`SET search_path TO ${this.schemaRef}, public`);
    });

    this.forum = new ForumRepository(this.pool, this.schemaRef);
    this.navItems = new NavItemsRepository(this.pool, this.schemaRef);
    this.manuals = new ManualsRepository(this.pool, this.schemaRef);
    this.announcements = new AnnouncementsRepository(this.pool, this.schemaRef);
    this.institutions = new InstitutionsRepository(this.pool, this.schemaRef);
    this.feedback = new FeedbackRepository(this.pool, this.schemaRef);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async waitUntilReady(retries: number, retryDelayMs: number): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.pool.query('SELECT 1');
        return;
      } catch (error) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Database connection failed');
  }

  async migrate(): Promise<void> {
    await runMigrations(this.pool, this.schemaRef);
  }
}
