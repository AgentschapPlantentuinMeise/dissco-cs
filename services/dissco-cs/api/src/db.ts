import { Pool } from 'pg';

import { appConfig } from './config.js';
import { AnnouncementsRepository } from './repositories/announcements.repository.js';
import { ForumRepository } from './repositories/forum.repository.js';
import { InstitutionsRepository } from './repositories/institutions.repository.js';
import { ProjectManualsRepository } from './repositories/project-manuals.repository.js';
import { SitePagesRepository } from './repositories/site-pages.repository.js';

export type { Announcement, AnnouncementTargetType } from './repositories/announcements.repository.js';
export { ANNOUNCEMENT_TARGET_TYPES } from './repositories/announcements.repository.js';
export type { ForumReply, ForumTopic, ForumTopicWithReplyCount } from './repositories/forum.repository.js';
export type { Institution, InstitutionInput } from './repositories/institutions.repository.js';
export type {
  ProjectManual,
  ProjectManualAttachmentMeta,
  ProjectManualSummary,
} from './repositories/project-manuals.repository.js';
export type { SitePage, SitePageContentKey, SitePageKey, SitePageLang } from './repositories/site-pages.repository.js';
export { SITE_PAGE_CONTENT_KEYS, SITE_PAGE_KEYS, SITE_PAGE_LANGS } from './repositories/site-pages.repository.js';

export class DisscoCSRepository {
  readonly forum: ForumRepository;
  readonly sitePages: SitePagesRepository;
  readonly announcements: AnnouncementsRepository;
  readonly institutions: InstitutionsRepository;
  readonly projectManuals: ProjectManualsRepository;

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
    this.sitePages = new SitePagesRepository(this.pool, this.schemaRef);
    this.projectManuals = new ProjectManualsRepository(this.pool, this.schemaRef);
    this.announcements = new AnnouncementsRepository(this.pool, this.schemaRef);
    this.institutions = new InstitutionsRepository(this.pool, this.schemaRef);
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
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${this.schemaRef}`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schemaRef}.forum_topics (
          id BIGSERIAL PRIMARY KEY,
          site_id INTEGER NOT NULL,
          author_user_id INTEGER NOT NULL,
          author_name TEXT NOT NULL,
          title TEXT NOT NULL,
          task_url TEXT,
          body TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS forum_topics_site_idx
        ON ${this.schemaRef}.forum_topics (site_id, last_activity DESC)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schemaRef}.forum_replies (
          id BIGSERIAL PRIMARY KEY,
          topic_id BIGINT NOT NULL REFERENCES ${this.schemaRef}.forum_topics (id) ON DELETE CASCADE,
          site_id INTEGER NOT NULL,
          author_user_id INTEGER NOT NULL,
          author_name TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS forum_replies_topic_idx
        ON ${this.schemaRef}.forum_replies (topic_id, created_at ASC)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schemaRef}.forum_read_state (
          user_id INTEGER NOT NULL,
          topic_id BIGINT NOT NULL REFERENCES ${this.schemaRef}.forum_topics (id) ON DELETE CASCADE,
          last_seen_reply_count INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, topic_id)
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schemaRef}.site_pages (
          site_id INTEGER NOT NULL,
          page_key TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          content JSONB NOT NULL DEFAULT '{}'::jsonb,
          contact_email TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          show_contact_form BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (site_id, page_key)
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schemaRef}.announcements (
          id BIGSERIAL PRIMARY KEY,
          site_id INTEGER NOT NULL,
          title JSONB NOT NULL DEFAULT '{}'::jsonb,
          description JSONB NOT NULL DEFAULT '{}'::jsonb,
          target_type TEXT NOT NULL,
          target_project_slug TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          start_date TIMESTAMPTZ,
          end_date TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS announcements_site_target_idx
        ON ${this.schemaRef}.announcements (site_id, target_type, target_project_slug)
      `);

      await client.query(`
        DO $$
        BEGIN
          IF (
            SELECT data_type FROM information_schema.columns
            WHERE table_schema = '${appConfig.postgresSchema}' AND table_name = 'announcements' AND column_name = 'title'
          ) = 'text' THEN
            ALTER TABLE ${this.schemaRef}.announcements
              ALTER COLUMN title TYPE JSONB USING jsonb_build_object('nl', title, 'en', title, 'fr', title, 'de', title),
              ALTER COLUMN title SET DEFAULT '{}'::jsonb,
              ALTER COLUMN description TYPE JSONB USING jsonb_build_object('nl', description, 'en', description, 'fr', description, 'de', description),
              ALTER COLUMN description SET DEFAULT '{}'::jsonb;
          END IF;
        END $$;
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schemaRef}.institutions (
          id BIGSERIAL PRIMARY KEY,
          site_id INTEGER NOT NULL,
          slug TEXT NOT NULL,
          name JSONB NOT NULL DEFAULT '{}'::jsonb,
          description JSONB NOT NULL DEFAULT '{}'::jsonb,
          email TEXT,
          phone TEXT,
          website TEXT,
          logo TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS institutions_site_slug_idx
        ON ${this.schemaRef}.institutions (site_id, slug)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS institutions_site_order_idx
        ON ${this.schemaRef}.institutions (site_id, sort_order)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schemaRef}.project_institution_links (
          site_id INTEGER NOT NULL,
          project_slug TEXT NOT NULL,
          institution_id BIGINT NOT NULL REFERENCES ${this.schemaRef}.institutions (id) ON DELETE CASCADE,
          PRIMARY KEY (site_id, project_slug)
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS project_institution_links_institution_idx
        ON ${this.schemaRef}.project_institution_links (institution_id)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schemaRef}.project_manuals (
          id BIGSERIAL PRIMARY KEY,
          site_id INTEGER NOT NULL,
          title JSONB NOT NULL DEFAULT '{}'::jsonb,
          content JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS project_manuals_site_idx
        ON ${this.schemaRef}.project_manuals (site_id)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schemaRef}.project_manual_links (
          site_id INTEGER NOT NULL,
          project_slug TEXT NOT NULL,
          manual_id BIGINT NOT NULL REFERENCES ${this.schemaRef}.project_manuals (id) ON DELETE CASCADE,
          PRIMARY KEY (site_id, project_slug)
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS project_manual_links_manual_idx
        ON ${this.schemaRef}.project_manual_links (manual_id)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schemaRef}.project_manual_attachments (
          id BIGSERIAL PRIMARY KEY,
          manual_id BIGINT NOT NULL REFERENCES ${this.schemaRef}.project_manuals (id) ON DELETE CASCADE,
          lang TEXT NOT NULL,
          filename TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          file_data BYTEA NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (manual_id, lang)
        )
      `);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
