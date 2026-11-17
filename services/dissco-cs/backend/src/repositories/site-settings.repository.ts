import { Pool } from 'pg';
import { HONOUR_BOARD_DEFAULT_THRESHOLD, HonourBoardMode, HonourBoardSettingsDto } from '@dissco-cs/shared-types';

export type SiteSettingsRow = {
  site_id: number;
  honour_board_mode: HonourBoardMode;
  honour_board_threshold: number;
  updated_at: Date;
  updated_by: number;
};

export class SiteSettingsRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string
  ) {}

  private get table(): string {
    return `${this.schemaRef}.site_settings`;
  }

  async get(siteId: number): Promise<SiteSettingsRow | null> {
    const result = await this.pool.query<SiteSettingsRow>(`SELECT * FROM ${this.table} WHERE site_id = $1`, [siteId]);
    return result.rows[0] ?? null;
  }

  async setHonourBoard(siteId: number, userId: number, settings: HonourBoardSettingsDto): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.table} (site_id, honour_board_mode, honour_board_threshold, updated_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (site_id) DO UPDATE
      SET honour_board_mode = EXCLUDED.honour_board_mode,
          honour_board_threshold = EXCLUDED.honour_board_threshold,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
    `,
      [siteId, settings.mode, settings.threshold, userId]
    );
  }
}

// ---- DTO mapping ----

// row null: the site has no settings of its own, so the defaults apply.
export function toHonourBoardSettingsDto(row: SiteSettingsRow | null): HonourBoardSettingsDto {
  return row
    ? { mode: row.honour_board_mode, threshold: row.honour_board_threshold }
    : { mode: 'prize', threshold: HONOUR_BOARD_DEFAULT_THRESHOLD };
}
