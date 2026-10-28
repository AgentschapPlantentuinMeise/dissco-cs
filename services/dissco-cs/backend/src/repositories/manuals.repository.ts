import { fromBigint } from '../database/bigint.js';
import { Pool } from 'pg';
import { ManualAttachmentDto, ManualDetailDto, ManualDto, ManualInput, ManualSummaryDto, PerLanguage, SitePageLang } from '@dissco-cs/shared-types';
import { FileStore } from '../infrastructure/file-store.js';

export type ManualRow = {
  id: number;
  site_id: number;
  title: Partial<Record<SitePageLang, string>>;
  content: Partial<Record<SitePageLang, string>>;
  updated_at: Date;
};

export type ManualSummary = ManualRow & { linkedProjectSlugs: string[]; attachmentLangs: SitePageLang[] };

export type ManualAttachmentMeta = {
  lang: SitePageLang;
  filename: string;
  mime_type: string;
  file_size: number;
  updated_at: Date;
};

export type ManualAttachmentFile = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

export type ManualAttachmentUpload = ManualAttachmentFile & { lang: SitePageLang };

export class ManualsRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string,
    private readonly files: FileStore
  ) {}

  private table(name: string): string {
    return `${this.schemaRef}.${name}`;
  }

  // One folder per manual, so deleting the manual removes all its attachments at once.
  private manualFolder(manualId: number): string {
    return `manuals/${manualId}`;
  }

  private attachmentKey(manualId: number, lang: SitePageLang): string {
    return `${this.manualFolder(manualId)}/${lang}`;
  }

  async listManuals(siteId: number): Promise<ManualSummary[]> {
    const manuals = await this.pool.query<ManualRow>(
      `SELECT * FROM ${this.table('manuals')} WHERE site_id = $1 ORDER BY updated_at DESC`,
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

    const manualIds = manuals.rows.map(manual => manual.id);
    const attachments =
      manualIds.length > 0
        ? await this.pool.query<{ manual_id: number; lang: SitePageLang }>(
            `SELECT manual_id, lang FROM ${this.table('manual_attachments')} WHERE manual_id = ANY($1::bigint[])`,
            [manualIds]
          )
        : { rows: [] };

    const attachmentLangsByManual = new Map<number, SitePageLang[]>();
    for (const row of attachments.rows) {
      const list = attachmentLangsByManual.get(row.manual_id) ?? [];
      list.push(row.lang);
      attachmentLangsByManual.set(row.manual_id, list);
    }

    return manuals.rows.map(manual => ({
      ...manual,
      linkedProjectSlugs: linksByManual.get(manual.id) ?? [],
      attachmentLangs: attachmentLangsByManual.get(manual.id) ?? [],
    }));
  }

  async getManualForProject(siteId: number, projectSlug: string): Promise<ManualRow | null> {
    const result = await this.pool.query<ManualRow>(
      `
      SELECT m.* FROM ${this.table('manuals')} m
      JOIN ${this.table('project_manual_links')} l ON l.manual_id = m.id
      WHERE l.site_id = $1 AND l.project_slug = $2
    `,
      [siteId, projectSlug]
    );

    return result.rows[0] ?? null;
  }

  async getManualById(siteId: number, manualId: number): Promise<ManualRow | null> {
    const result = await this.pool.query<ManualRow>(
      `SELECT * FROM ${this.table('manuals')} WHERE id = $1 AND site_id = $2`,
      [manualId, siteId]
    );

    return result.rows[0] ?? null;
  }

  // Saves a manual's text and its attachment changes as one: all of it or none. The files are
  // staged first and only put at their key after the commit, so a failed save leaves the stored
  // attachments as they were. manualId null creates the manual.
  // Returns null when manualId is not a manual of this site.
  async saveManual(
    siteId: number,
    manualId: number | null,
    input: ManualInput,
    uploads: ManualAttachmentUpload[],
    removeLangs: SitePageLang[]
  ): Promise<ManualRow | null> {
    const staged = await Promise.all(uploads.map(upload => this.files.stage(upload.buffer)));
    const discardStaged = () => Promise.all(staged.map(file => this.files.discard(file)));

    const client = await this.pool.connect();
    let manual: ManualRow | undefined;
    try {
      await client.query('BEGIN');

      const title = JSON.stringify(input.title);
      const content = JSON.stringify(input.content);
      const result =
        manualId === null
          ? await client.query<ManualRow>(
              `INSERT INTO ${this.table('manuals')} (site_id, title, content) VALUES ($1, $2, $3) RETURNING *`,
              [siteId, title, content]
            )
          : await client.query<ManualRow>(
              `UPDATE ${this.table('manuals')} SET title = $3, content = $4, updated_at = NOW() WHERE id = $1 AND site_id = $2 RETURNING *`,
              [manualId, siteId, title, content]
            );
      manual = result.rows[0];

      if (manual) {
        for (const upload of uploads) {
          await client.query(
            `
            INSERT INTO ${this.table('manual_attachments')} (manual_id, lang, filename, mime_type, file_size)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (manual_id, lang) DO UPDATE
            SET filename = EXCLUDED.filename, mime_type = EXCLUDED.mime_type, file_size = EXCLUDED.file_size,
                updated_at = NOW()
          `,
            [manual.id, upload.lang, upload.filename, upload.mimeType, upload.buffer.length]
          );
        }
        if (removeLangs.length > 0) {
          await client.query(
            `DELETE FROM ${this.table('manual_attachments')} WHERE manual_id = $1 AND lang = ANY($2::text[])`,
            [manual.id, removeLangs]
          );
        }
      }

      await client.query(manual ? 'COMMIT' : 'ROLLBACK');
    } catch (error) {
      await client.query('ROLLBACK');
      await discardStaged();
      throw error;
    } finally {
      client.release();
    }

    if (!manual) {
      await discardStaged();
      return null;
    }

    // After the commit: a crash here leaves a staged .tmp (removed at startup), never a changed
    // attachment without its row.
    const id = fromBigint(manual.id);
    await Promise.all(uploads.map((upload, i) => this.files.place(staged[i], this.attachmentKey(id, upload.lang))));
    await Promise.all(removeLangs.map(lang => this.files.remove(this.attachmentKey(id, lang))));
    return manual;
  }

  // The attachment rows go with the manual (ON DELETE CASCADE); their files do not, so the folder
  // is removed here.
  async deleteManual(siteId: number, manualId: number): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM ${this.table('manuals')} WHERE id = $1 AND site_id = $2`,
      [manualId, siteId]
    );

    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      await this.files.removeDir(this.manualFolder(manualId));
    }
    return deleted;
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

  // Removes links to projects that were deleted in Madoc (see
  // InstitutionsRepository.pruneOrphanedProjectLinks).
  async pruneOrphanedProjectLinks(siteId: number, liveSlugs: string[]): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM ${this.table('project_manual_links')} WHERE site_id = $1 AND project_slug <> ALL($2::text[])`,
      [siteId, liveSlugs]
    );

    return result.rowCount ?? 0;
  }

  async listAttachmentMeta(manualId: number): Promise<ManualAttachmentMeta[]> {
    const result = await this.pool.query<ManualAttachmentMeta>(
      `
      SELECT lang, filename, mime_type, file_size, updated_at
      FROM ${this.table('manual_attachments')}
      WHERE manual_id = $1
    `,
      [manualId]
    );

    return result.rows;
  }

  async getAttachmentFile(manualId: number, lang: SitePageLang): Promise<ManualAttachmentFile | null> {
    const result = await this.pool.query<{ filename: string; mime_type: string }>(
      `SELECT filename, mime_type FROM ${this.table('manual_attachments')} WHERE manual_id = $1 AND lang = $2`,
      [manualId, lang]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return { filename: row.filename, mimeType: row.mime_type, buffer: await this.files.read(this.attachmentKey(manualId, lang)) };
  }
}

// ---- DTO mapping ----

export function toManualDto(row: ManualRow): ManualDto {
  return { id: fromBigint(row.id), title: row.title, content: row.content, updatedAt: row.updated_at.toISOString() };
}

export function toManualSummaryDto(summary: ManualSummary): ManualSummaryDto {
  return { ...toManualDto(summary), linkedProjectSlugs: summary.linkedProjectSlugs, attachmentLangs: summary.attachmentLangs };
}

export function toManualDetailDto(manual: ManualRow, attachmentMeta: ManualAttachmentMeta[]): ManualDetailDto {
  const attachments: PerLanguage<ManualAttachmentDto> = {};
  for (const meta of attachmentMeta) {
    attachments[meta.lang] = { filename: meta.filename, mimeType: meta.mime_type, size: meta.file_size };
  }

  return { id: fromBigint(manual.id), title: manual.title, content: manual.content, attachments };
}
