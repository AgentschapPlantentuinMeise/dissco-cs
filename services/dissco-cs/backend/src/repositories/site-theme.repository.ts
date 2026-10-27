import { Pool } from 'pg';
import { SiteColors, SiteThemeDto } from '@dissco-cs/shared-types';

export type SiteThemeRow = {
  site_id: number;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  dark_color: string | null;
  tertiary_color: string | null;
  site_name: string | null;
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

  async upsertColors(siteId: number, colors: SiteColors): Promise<void> {
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

  // The row stays: it may also hold the site's name.
  async clearColors(siteId: number): Promise<void> {
    await this.pool.query(
      `
      UPDATE ${this.table}
      SET primary_color = NULL, secondary_color = NULL, accent_color = NULL, dark_color = NULL, tertiary_color = NULL,
          updated_at = NOW()
      WHERE site_id = $1
    `,
      [siteId]
    );
  }

  // null removes the site's own name.
  async setName(siteId: number, name: string | null): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.table} (site_id, site_name) VALUES ($1, $2)
      ON CONFLICT (site_id) DO UPDATE SET site_name = EXCLUDED.site_name, updated_at = NOW()
    `,
      [siteId, name]
    );
  }
}

// ---- DTO mapping ----

// null: the site has no row yet (no palette and no name of its own).
export function toSiteThemeDto(row: SiteThemeRow | null): SiteThemeDto {
  return { colors: row ? toSiteColors(row) : null, name: row?.site_name ?? null };
}

// null while the site has no palette of its own (the colors are set and cleared together).
export function toSiteColors(row: SiteThemeRow): SiteColors | null {
  if (
    row.primary_color === null ||
    row.secondary_color === null ||
    row.accent_color === null ||
    row.dark_color === null ||
    row.tertiary_color === null
  ) {
    return null;
  }
  return {
    primary: row.primary_color,
    secondary: row.secondary_color,
    accent: row.accent_color,
    dark: row.dark_color,
    tertiary: row.tertiary_color,
  };
}
