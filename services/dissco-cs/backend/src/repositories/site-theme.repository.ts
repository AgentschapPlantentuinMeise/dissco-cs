import { Pool } from 'pg';
import { SiteColors } from '@dissco-cs/shared-types';

export type SiteThemeRow = {
  site_id: number;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  dark_color: string;
  tertiary_color: string;
  updated_at: Date;
};

export class SiteThemeRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string
  ) {}

  private get table(): string {
    return `${this.schemaRef}.site_theme`;
  }

  async get(siteId: number): Promise<SiteThemeRow | null> {
    const result = await this.pool.query<SiteThemeRow>(`SELECT * FROM ${this.table} WHERE site_id = $1`, [siteId]);
    return result.rows[0] ?? null;
  }

  async upsert(siteId: number, colors: SiteColors): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.table} (site_id, primary_color, secondary_color, accent_color, dark_color, tertiary_color)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (site_id) DO UPDATE
      SET primary_color = EXCLUDED.primary_color,
          secondary_color = EXCLUDED.secondary_color,
          accent_color = EXCLUDED.accent_color,
          dark_color = EXCLUDED.dark_color,
          tertiary_color = EXCLUDED.tertiary_color,
          updated_at = NOW()
    `,
      [siteId, colors.primary, colors.secondary, colors.accent, colors.dark, colors.tertiary]
    );
  }

  async delete(siteId: number): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.table} WHERE site_id = $1`, [siteId]);
  }
}

// ---- DTO mapping ----

export function toSiteColors(row: SiteThemeRow): SiteColors {
  return {
    primary: row.primary_color,
    secondary: row.secondary_color,
    accent: row.accent_color,
    dark: row.dark_color,
    tertiary: row.tertiary_color,
  };
}
