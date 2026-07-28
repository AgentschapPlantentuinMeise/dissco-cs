import { Pool } from 'pg';
import { SitePageLang } from './site-pages.repository.js';

export type ProjectManual = {
  id: number;
  site_id: number;
  title: Partial<Record<SitePageLang, string>>;
  content: Partial<Record<SitePageLang, string>>;
  updated_at: Date;
};

export type ProjectManualSummary = ProjectManual & { linkedProjectSlugs: string[] };

export type ProjectManualAttachmentMeta = {
  lang: SitePageLang;
  filename: string;
  mime_type: string;
  file_size: number;
  updated_at: Date;
};

export type ProjectManualAttachmentFile = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

export class ProjectManualsRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string
  ) {}

  private table(name: string): string {
    return `${this.schemaRef}.${name}`;
  }

  async listManuals(siteId: number): Promise<ProjectManualSummary[]> {
    const manuals = await this.pool.query<ProjectManual>(
      `SELECT * FROM ${this.table('project_manuals')} WHERE site_id = $1 ORDER BY updated_at DESC`,
      [siteId]
    );

    const links = await this.pool.query<{ manual_id: number; project_slug: string }>(
      `SELECT manual_id, project_slug FROM ${this.table('project_manual_links')} WHERE site_id = $1`,
      [siteId]
    );

    const linksByManual = new Map<number, string[]>();
    for (const row of links.rows) {
      const list = linksByManual.get(row.manual_id) ?? [];
      list.push(row.project_slug);
      linksByManual.set(row.manual_id, list);
    }

    return manuals.rows.map(manual => ({
      ...manual,
      linkedProjectSlugs: linksByManual.get(manual.id) ?? [],
    }));
  }

  async getManualForProject(siteId: number, projectSlug: string): Promise<ProjectManual | null> {
    const result = await this.pool.query<ProjectManual>(
      `
      SELECT m.* FROM ${this.table('project_manuals')} m
      JOIN ${this.table('project_manual_links')} l ON l.manual_id = m.id
      WHERE l.site_id = $1 AND l.project_slug = $2
    `,
      [siteId, projectSlug]
    );

    return result.rows[0] ?? null;
  }

  async getManualById(siteId: number, manualId: number): Promise<ProjectManual | null> {
    const result = await this.pool.query<ProjectManual>(
      `SELECT * FROM ${this.table('project_manuals')} WHERE id = $1 AND site_id = $2`,
      [manualId, siteId]
    );

    return result.rows[0] ?? null;
  }

  async createManual(siteId: number, title: Partial<Record<SitePageLang, string>>): Promise<ProjectManual> {
    const result = await this.pool.query<ProjectManual>(
      `INSERT INTO ${this.table('project_manuals')} (site_id, title) VALUES ($1, $2) RETURNING *`,
      [siteId, JSON.stringify(title)]
    );

    return result.rows[0];
  }

  async updateManualTitle(
    siteId: number,
    manualId: number,
    lang: SitePageLang,
    title: string
  ): Promise<ProjectManual | null> {
    const result = await this.pool.query<ProjectManual>(
      `
      UPDATE ${this.table('project_manuals')}
      SET title = jsonb_set(title, ARRAY[$3::text], to_jsonb($4::text)), updated_at = NOW()
      WHERE id = $1 AND site_id = $2
      RETURNING *
    `,
      [manualId, siteId, lang, title]
    );

    return result.rows[0] ?? null;
  }

  async updateManualContent(siteId: number, manualId: number, lang: SitePageLang, contentMd: string): Promise<boolean> {
    const result = await this.pool.query(
      `
      UPDATE ${this.table('project_manuals')}
      SET content = jsonb_set(content, ARRAY[$3::text], to_jsonb($4::text)), updated_at = NOW()
      WHERE id = $1 AND site_id = $2
    `,
      [manualId, siteId, lang, contentMd]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async deleteManual(siteId: number, manualId: number): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM ${this.table('project_manuals')} WHERE id = $1 AND site_id = $2`,
      [manualId, siteId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async setProjectLink(siteId: number, projectSlug: string, manualId: number | null): Promise<void> {
    if (manualId === null) {
      await this.pool.query(
        `DELETE FROM ${this.table('project_manual_links')} WHERE site_id = $1 AND project_slug = $2`,
        [siteId, projectSlug]
      );
      return;
    }

    await this.pool.query(
      `
      INSERT INTO ${this.table('project_manual_links')} (site_id, project_slug, manual_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (site_id, project_slug) DO UPDATE SET manual_id = EXCLUDED.manual_id
    `,
      [siteId, projectSlug, manualId]
    );
  }

  async listAttachmentMeta(manualId: number): Promise<ProjectManualAttachmentMeta[]> {
    const result = await this.pool.query<ProjectManualAttachmentMeta>(
      `
      SELECT lang, filename, mime_type, file_size, updated_at
      FROM ${this.table('project_manual_attachments')}
      WHERE manual_id = $1
    `,
      [manualId]
    );

    return result.rows;
  }

  async getAttachmentFile(manualId: number, lang: SitePageLang): Promise<ProjectManualAttachmentFile | null> {
    const result = await this.pool.query<{ filename: string; mime_type: string; file_data: Buffer }>(
      `SELECT filename, mime_type, file_data FROM ${this.table('project_manual_attachments')} WHERE manual_id = $1 AND lang = $2`,
      [manualId, lang]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return { filename: row.filename, mimeType: row.mime_type, buffer: row.file_data };
  }

  async upsertAttachment(manualId: number, lang: SitePageLang, input: ProjectManualAttachmentFile): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.table('project_manual_attachments')} (manual_id, lang, filename, mime_type, file_size, file_data)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (manual_id, lang) DO UPDATE
      SET filename = EXCLUDED.filename, mime_type = EXCLUDED.mime_type, file_size = EXCLUDED.file_size,
          file_data = EXCLUDED.file_data, updated_at = NOW()
    `,
      [manualId, lang, input.filename, input.mimeType, input.buffer.length, input.buffer]
    );
  }

  async deleteAttachment(manualId: number, lang: SitePageLang): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM ${this.table('project_manual_attachments')} WHERE manual_id = $1 AND lang = $2`,
      [manualId, lang]
    );

    return (result.rowCount ?? 0) > 0;
  }
}
