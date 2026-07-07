import { Pool, PoolClient } from 'pg';
import { SitePageLang } from './site-pages.repository.js';

export type Institution = {
  id: number;
  site_id: number;
  slug: string;
  name: Partial<Record<SitePageLang, string>>;
  description: Partial<Record<SitePageLang, string>>;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

export type InstitutionInput = {
  name: Partial<Record<SitePageLang, string>>;
  description: Partial<Record<SitePageLang, string>>;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo: string | null;
  isActive: boolean;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class InstitutionsRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string
  ) {}

  private table(name: string): string {
    return `${this.schemaRef}.${name}`;
  }

  async listInstitutions(siteId: number): Promise<Institution[]> {
    const result = await this.pool.query<Institution>(
      `SELECT * FROM ${this.table('institutions')} WHERE site_id = $1 ORDER BY sort_order ASC, id ASC`,
      [siteId]
    );

    return result.rows;
  }

  async listActiveInstitutions(siteId: number): Promise<Institution[]> {
    const result = await this.pool.query<Institution>(
      `SELECT * FROM ${this.table('institutions')} WHERE site_id = $1 AND is_active = TRUE ORDER BY sort_order ASC, id ASC`,
      [siteId]
    );

    return result.rows;
  }

  async getActiveInstitutionBySlug(siteId: number, slug: string): Promise<Institution | null> {
    const result = await this.pool.query<Institution>(
      `SELECT * FROM ${this.table('institutions')} WHERE site_id = $1 AND slug = $2 AND is_active = TRUE`,
      [siteId, slug]
    );

    return result.rows[0] ?? null;
  }

  async createInstitution(siteId: number, input: InstitutionInput): Promise<Institution> {
    const baseName = input.name.nl || input.name.en || input.name.fr || input.name.de || 'instituut';
    const slug = await this.uniqueInstitutionSlug(siteId, baseName, null);

    const result = await this.pool.query<Institution>(
      `
      INSERT INTO ${this.table('institutions')} (
        site_id, slug, name, description, email, phone, website, logo, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        input.logo,
        input.isActive,
      ]
    );

    return result.rows[0];
  }

  async updateInstitution(siteId: number, id: number, input: InstitutionInput): Promise<Institution | null> {
    const existing = await this.pool.query<Institution>(
      `SELECT * FROM ${this.table('institutions')} WHERE id = $1 AND site_id = $2`,
      [id, siteId]
    );

    if (existing.rows.length === 0) {
      return null;
    }

    const baseName = input.name.nl || input.name.en || input.name.fr || input.name.de || 'instituut';
    const slug = await this.uniqueInstitutionSlug(siteId, baseName, id);

    const result = await this.pool.query<Institution>(
      `
      UPDATE ${this.table('institutions')}
      SET slug = $3, name = $4, description = $5, email = $6, phone = $7, website = $8, logo = $9,
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
        input.logo,
        input.isActive,
      ]
    );

    return result.rows[0] ?? null;
  }

  async deleteInstitution(siteId: number, id: number): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM ${this.table('institutions')} WHERE id = $1 AND site_id = $2`,
      [id, siteId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async setInstitutionsOrder(siteId: number, orderedIds: number[]): Promise<void> {
    await this.runOrderedUpdate(orderedIds, (client, id, sortOrder) =>
      client.query(
        `UPDATE ${this.table('institutions')} SET sort_order = $3, updated_at = NOW() WHERE id = $1 AND site_id = $2`,
        [id, siteId, sortOrder]
      )
    );
  }

  private async uniqueInstitutionSlug(siteId: number, baseName: string, excludeId: number | null): Promise<string> {
    const base = slugify(baseName) || 'instituut';
    let candidate = base;
    let suffix = 2;

    // eslint-disable-next-line no-constant-condition
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

  private async runOrderedUpdate<T>(
    items: T[],
    queryFor: (client: PoolClient, item: T, index: number) => Promise<unknown>
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < items.length; i++) {
        await queryFor(client, items[i], i);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
