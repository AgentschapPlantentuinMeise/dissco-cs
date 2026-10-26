import { Pool } from 'pg';
import { SiteImageDto, SiteImageKey } from '@dissco-cs/shared-types';

// Without file_data: the list and the admin panel only need to know which images are set.
export type SiteImageMetaRow = {
  image_key: SiteImageKey;
  credit: string | null;
  updated_at: Date;
};

export type SiteImageFile = { mimeType: string; buffer: Buffer };

export class SiteImagesRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string
  ) {}

  private get table(): string {
    return `${this.schemaRef}.site_images`;
  }

  async list(siteId: number): Promise<SiteImageMetaRow[]> {
    const result = await this.pool.query<SiteImageMetaRow>(
      `SELECT image_key, credit, updated_at FROM ${this.table} WHERE site_id = $1 ORDER BY image_key`,
      [siteId]
    );
    return result.rows;
  }

  async getFile(siteId: number, key: SiteImageKey): Promise<SiteImageFile | null> {
    const result = await this.pool.query<{ mime_type: string; file_data: Buffer }>(
      `SELECT mime_type, file_data FROM ${this.table} WHERE site_id = $1 AND image_key = $2`,
      [siteId, key]
    );

    const row = result.rows[0];
    return row ? { mimeType: row.mime_type, buffer: row.file_data } : null;
  }

  // Replacing the image keeps the credit: the admin changes it separately (setCredit).
  async upsertFile(siteId: number, key: SiteImageKey, file: SiteImageFile): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.table} (site_id, image_key, mime_type, file_size, file_data)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (site_id, image_key) DO UPDATE
      SET mime_type = EXCLUDED.mime_type, file_size = EXCLUDED.file_size, file_data = EXCLUDED.file_data,
          updated_at = NOW()
    `,
      [siteId, key, file.mimeType, file.buffer.length, file.buffer]
    );
  }

  async setCredit(siteId: number, key: SiteImageKey, credit: string | null): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE ${this.table} SET credit = $3, updated_at = NOW() WHERE site_id = $1 AND image_key = $2`,
      [siteId, key, credit]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async delete(siteId: number, key: SiteImageKey): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.table} WHERE site_id = $1 AND image_key = $2`, [siteId, key]);
  }
}

// ---- DTO mapping ----

export function toSiteImageDto(row: SiteImageMetaRow): SiteImageDto {
  return { key: row.image_key, credit: row.credit, updatedAt: row.updated_at.toISOString() };
}
