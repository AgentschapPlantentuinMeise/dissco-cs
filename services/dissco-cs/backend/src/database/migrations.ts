import { Pool } from 'pg';

import { appConfig } from '../config.js';

// Creates/updates our own tables. Idempotent (IF NOT EXISTS + guarded ALTERs), runs at startup
// when appConfig.migrate is on.
export async function runMigrations(pool: Pool, schemaRef: string): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaRef}`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaRef}.forum_topics (
        id BIGSERIAL PRIMARY KEY,
        site_id INTEGER NOT NULL,
        author_user_id INTEGER NOT NULL,
        author_name TEXT NOT NULL,
        title TEXT NOT NULL,
        task_url TEXT,
        project_slug TEXT,
        project_label TEXT,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMPTZ
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS forum_topics_site_idx
      ON ${schemaRef}.forum_topics (site_id, last_activity DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaRef}.forum_replies (
        id BIGSERIAL PRIMARY KEY,
        topic_id BIGINT NOT NULL REFERENCES ${schemaRef}.forum_topics (id) ON DELETE CASCADE,
        site_id INTEGER NOT NULL,
        author_user_id INTEGER NOT NULL,
        author_name TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS forum_replies_topic_idx
      ON ${schemaRef}.forum_replies (topic_id, created_at ASC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaRef}.forum_read_state (
        user_id INTEGER NOT NULL,
        topic_id BIGINT NOT NULL REFERENCES ${schemaRef}.forum_topics (id) ON DELETE CASCADE,
        last_seen_reply_count INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, topic_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaRef}.nav_items (
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
      CREATE TABLE IF NOT EXISTS ${schemaRef}.announcements (
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
      ON ${schemaRef}.announcements (site_id, target_type, target_project_slug)
    `);

    await client.query(`
      DO $$
      BEGIN
        IF (
          SELECT data_type FROM information_schema.columns
          WHERE table_schema = '${appConfig.postgresSchema}' AND table_name = 'announcements' AND column_name = 'title'
        ) = 'text' THEN
          ALTER TABLE ${schemaRef}.announcements
            ALTER COLUMN title TYPE JSONB USING jsonb_build_object('nl', title, 'en', title, 'fr', title, 'de', title),
            ALTER COLUMN title SET DEFAULT '{}'::jsonb,
            ALTER COLUMN description TYPE JSONB USING jsonb_build_object('nl', description, 'en', description, 'fr', description, 'de', description),
            ALTER COLUMN description SET DEFAULT '{}'::jsonb;
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaRef}.institutions (
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
      ON ${schemaRef}.institutions (site_id, slug)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS institutions_site_order_idx
      ON ${schemaRef}.institutions (site_id, sort_order)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaRef}.project_institution_links (
        site_id INTEGER NOT NULL,
        project_slug TEXT NOT NULL,
        institution_id BIGINT NOT NULL REFERENCES ${schemaRef}.institutions (id) ON DELETE CASCADE,
        PRIMARY KEY (site_id, project_slug)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS project_institution_links_institution_idx
      ON ${schemaRef}.project_institution_links (institution_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaRef}.manuals (
        id BIGSERIAL PRIMARY KEY,
        site_id INTEGER NOT NULL,
        title JSONB NOT NULL DEFAULT '{}'::jsonb,
        content JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS manuals_site_idx
      ON ${schemaRef}.manuals (site_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaRef}.project_manual_links (
        site_id INTEGER NOT NULL,
        project_slug TEXT NOT NULL,
        manual_id BIGINT NOT NULL REFERENCES ${schemaRef}.manuals (id) ON DELETE CASCADE,
        PRIMARY KEY (site_id, project_slug)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS project_manual_links_manual_idx
      ON ${schemaRef}.project_manual_links (manual_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaRef}.manual_attachments (
        id BIGSERIAL PRIMARY KEY,
        manual_id BIGINT NOT NULL REFERENCES ${schemaRef}.manuals (id) ON DELETE CASCADE,
        lang TEXT NOT NULL,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_data BYTEA NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (manual_id, lang)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaRef}.feedback_threads (
        id BIGSERIAL PRIMARY KEY,
        site_id INTEGER NOT NULL,
        reviewer_user_id INTEGER NOT NULL,
        reviewer_name TEXT NOT NULL,
        recipient_user_id INTEGER NOT NULL,
        recipient_name TEXT NOT NULL,
        subject TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewer_hidden_at TIMESTAMPTZ,
        recipient_hidden_at TIMESTAMPTZ
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS feedback_threads_recipient_idx
      ON ${schemaRef}.feedback_threads (site_id, recipient_user_id, last_activity DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS feedback_threads_reviewer_idx
      ON ${schemaRef}.feedback_threads (site_id, reviewer_user_id, last_activity DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaRef}.feedback_messages (
        id BIGSERIAL PRIMARY KEY,
        thread_id BIGINT NOT NULL REFERENCES ${schemaRef}.feedback_threads (id) ON DELETE CASCADE,
        author_user_id INTEGER NOT NULL,
        author_name TEXT NOT NULL,
        body TEXT NOT NULL,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS feedback_messages_thread_idx
      ON ${schemaRef}.feedback_messages (thread_id, created_at ASC)
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
