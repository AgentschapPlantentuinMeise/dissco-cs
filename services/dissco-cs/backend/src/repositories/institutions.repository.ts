import { fromBigint } from '../database/bigint.js';
import { Pool } from 'pg';
import { InstitutionDto, InstitutionInput, SitePageLang, firstFilledLang, slugify } from '@dissco-cs/shared-types';
import { FileStore } from '../infrastructure/file-store.js';

export type InstitutionLogo = { mimeType: string; buffer: Buffer };

export type InstitutionRow = {
  id: number;
  site_id: number;
  slug: string;
  name: Partial<Record<SitePageLang, string>>;
  description: Partial<Record<SitePageLang, string>>;
  email: string | null;
  phone: string | null;
  website: string | null;
  // The logo itself is a file on disk (logoKey); null when there is none.
  logo_mime_type: string | null;
  logo_updated_at: Date | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

export class InstitutionsRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string,
    private readonly files: FileStore
  ) {}

  private table(name: string): string {
    return `${this.schemaRef}.${name}`;
  }

  private institutionFolder(id: number): string {
    return `institutions/${id}`;
  }

  private logoKey(id: number): string {
    return `${this.institutionFolder(id)}/logo`;
  }

  // The logo is staged first and only put at its key once the row is saved, so a failed save
  // leaves the stored logo as it was. A new institution's id only comes from its insert.
  private async saveWithLogo<T extends InstitutionRow | null>(
    logo: InstitutionLogo | null,
    saveRow: () => Promise<T>
  ): Promise<T> {
    const staged = logo ? await this.files.stage(logo.buffer) : null;

    let row: T;
    try {
      row = await saveRow();
    } catch (error) {
      if (staged) await this.files.discard(staged);
      throw error;
    }

    if (staged) {
      await (row ? this.files.place(staged, this.logoKey(fromBigint(row.id))) : this.files.discard(staged));
    }
    return row;
  }

  async listInstitutions(siteId: number): Promise<InstitutionRow[]> {
    const result = await this.pool.query<InstitutionRow>(
      `SELECT * FROM ${this.table('institutions')} WHERE site_id = $1 ORDER BY sort_order ASC, id ASC`,
      [siteId]
    );

    return result.rows;
  }

  async listActiveInstitutions(siteId: number): Promise<InstitutionRow[]> {
    const result = await this.pool.query<InstitutionRow>(
      `SELECT * FROM ${this.table('institutions')} WHERE site_id = $1 AND is_active = TRUE ORDER BY sort_order ASC, id ASC`,
      [siteId]
    );

    return result.rows;
  }

  async getActiveInstitutionBySlug(siteId: number, slug: string): Promise<InstitutionRow | null> {
    const result = await this.pool.query<InstitutionRow>(
      `SELECT * FROM ${this.table('institutions')} WHERE site_id = $1 AND slug = $2 AND is_active = TRUE`,
      [siteId, slug]
    );

    return result.rows[0] ?? null;
  }

  async getActiveInstitutionForProjectSlug(siteId: number, projectSlug: string): Promise<InstitutionRow | null> {
    const result = await this.pool.query<InstitutionRow>(
      `
      SELECT i.* FROM ${this.table('institutions')} i
      JOIN ${this.table('project_institution_links')} l ON l.institution_id = i.id
      WHERE l.site_id = $1 AND l.project_slug = $2 AND i.is_active = TRUE
    `,
      [siteId, projectSlug]
    );

    return result.rows[0] ?? null;
  }

  async listProjectSlugsForInstitution(siteId: number, institutionId: number): Promise<string[]> {
    const result = await this.pool.query<{ project_slug: string }>(
      `SELECT project_slug FROM ${this.table('project_institution_links')} WHERE site_id = $1 AND institution_id = $2`,
      [siteId, institutionId]
    );

    return result.rows.map(row => row.project_slug);
  }

  async createInstitution(siteId: number, input: InstitutionInput, logo: InstitutionLogo): Promise<InstitutionRow> {
    const slug = await this.uniqueInstitutionSlug(siteId, firstFilledLang(input.name) ?? '', null);

    return this.saveWithLogo(logo, async () => {
      const result = await this.pool.query<InstitutionRow>(
        `
        INSERT INTO ${this.table('institutions')} (
          site_id, slug, name, description, email, phone, website, logo_mime_type, logo_updated_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
        RETURNING *
      `,
        [
          siteId,
          slug,
          JSON.stringify(input.name),
          JSON.stringify(input.description),
          input.email,
          input.phone,
          input.website,
          logo.mimeType,
          input.isActive,
        ]
      );
      return result.rows[0];
    });
  }

  // logo null keeps the stored logo.
  async updateInstitution(
    siteId: number,
    id: number,
    input: InstitutionInput,
    logo: InstitutionLogo | null
  ): Promise<InstitutionRow | null> {
    const existing = await this.pool.query<InstitutionRow>(
      `SELECT * FROM ${this.table('institutions')} WHERE id = $1 AND site_id = $2`,
      [id, siteId]
    );

    if (existing.rows.length === 0) {
      return null;
    }

    const slug = await this.uniqueInstitutionSlug(siteId, firstFilledLang(input.name) ?? '', id);

    return this.saveWithLogo(logo, async () => {
      const result = await this.pool.query<InstitutionRow>(
        `
        UPDATE ${this.table('institutions')}
        SET slug = $3, name = $4, description = $5, email = $6, phone = $7, website = $8,
            logo_mime_type = COALESCE($9, logo_mime_type),
            logo_updated_at = CASE WHEN $9::text IS NULL THEN logo_updated_at ELSE NOW() END,
            is_active = $10, updated_at = NOW()
        WHERE id = $1 AND site_id = $2
        RETURNING *
      `,
        [
          id,
          siteId,
          slug,
          JSON.stringify(input.name),
          JSON.stringify(input.description),
          input.email,
          input.phone,
          input.website,
          logo?.mimeType ?? null,
          input.isActive,
        ]
      );
      return result.rows[0] ?? null;
    });
  }

  async getLogoFile(siteId: number, id: number): Promise<InstitutionLogo | null> {
    const result = await this.pool.query<{ logo_mime_type: string }>(
      `SELECT logo_mime_type FROM ${this.table('institutions')} WHERE id = $1 AND site_id = $2 AND logo_mime_type IS NOT NULL`,
      [id, siteId]
    );

    const row = result.rows[0];
    return row ? { mimeType: row.logo_mime_type, buffer: await this.files.read(this.logoKey(id)) } : null;
  }

  async getInstitutionById(siteId: number, id: number): Promise<InstitutionRow | null> {
    const result = await this.pool.query<InstitutionRow>(
      `SELECT * FROM ${this.table('institutions')} WHERE id = $1 AND site_id = $2`,
      [id, siteId]
    );

    return result.rows[0] ?? null;
  }

  async listProjectLinks(siteId: number): Promise<Record<string, number>> {
    const result = await this.pool.query<{ project_slug: string; institution_id: number }>(
      `SELECT project_slug, institution_id FROM ${this.table('project_institution_links')} WHERE site_id = $1`,
      [siteId]
    );

    const links: Record<string, number> = {};
    for (const row of result.rows) {
      links[row.project_slug] = fromBigint(row.institution_id);
    }

    return links;
  }

  async setProjectLink(siteId: number, projectSlug: string, institutionId: number | null): Promise<void> {
    if (institutionId === null) {
      await this.pool.query(
        `DELETE FROM ${this.table('project_institution_links')} WHERE site_id = $1 AND project_slug = $2`,
        [siteId, projectSlug]
      );
      return;
    }

    await this.pool.query(
      `
      INSERT INTO ${this.table('project_institution_links')} (site_id, project_slug, institution_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (site_id, project_slug) DO UPDATE SET institution_id = EXCLUDED.institution_id
    `,
      [siteId, projectSlug, institutionId]
    );
  }

  // Removes links to projects that were deleted in Madoc. dissco-cs is not told when Madoc deletes
  // a project, so this compares against the current project list that the caller passes in.
  async pruneOrphanedProjectLinks(siteId: number, liveSlugs: string[]): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM ${this.table('project_institution_links')} WHERE site_id = $1 AND project_slug <> ALL($2::text[])`,
      [siteId, liveSlugs]
    );

    return result.rowCount ?? 0;
  }

  async deleteInstitution(siteId: number, id: number): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM ${this.table('institutions')} WHERE id = $1 AND site_id = $2`,
      [id, siteId]
    );

    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      await this.files.removeDir(this.institutionFolder(id));
    }
    return deleted;
  }

  private async uniqueInstitutionSlug(siteId: number, baseName: string, excludeId: number | null): Promise<string> {
    const base = slugify(baseName, 'instituut');
    let candidate = base;
    let suffix = 2;

    // eslint-disable-next-line no-constant-condition -- ends with the return once a slug is free
    while (true) {
      const result = await this.pool.query(
        `SELECT id FROM ${this.table('institutions')} WHERE site_id = $1 AND slug = $2 AND id <> $3`,
        [siteId, candidate, excludeId ?? 0]
      );

      if (result.rows.length === 0) {
        return candidate;
      }

      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
  }
}

// ---- DTO mapping ----

export function toInstitutionDto(row: InstitutionRow): InstitutionDto {
  return {
    id: fromBigint(row.id),
    slug: row.slug,
    name: row.name,
    description: row.description,
    email: row.email,
    phone: row.phone,
    website: row.website,
    logoUpdatedAt: row.logo_updated_at?.toISOString() ?? null,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}
