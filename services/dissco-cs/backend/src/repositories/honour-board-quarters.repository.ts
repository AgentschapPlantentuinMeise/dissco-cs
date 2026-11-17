import { Pool } from 'pg';
import { HonourBoardPrizeDto, HonourBoardQuarterKey, MultilingualText } from '@dissco-cs/shared-types';
import { QuarterCount, QuarterRecord } from '../madoc-db/honour-board.logic.js';

export type HonourBoardQuarterRow = {
  site_id: number;
  quarter: HonourBoardQuarterKey;
  prize_title: MultilingualText | null;
  prize_note: MultilingualText | null;
  winner_user_urn: string | null;
  pool: QuarterCount[] | null;
  pool_threshold: number | null;
  winner_chosen_at: Date | null;
  updated_at: Date;
  updated_by: number;
};

export class HonourBoardQuartersRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string
  ) {}

  private get table(): string {
    return `${this.schemaRef}.honour_board_quarters`;
  }

  async get(siteId: number, quarter: HonourBoardQuarterKey): Promise<HonourBoardQuarterRow | null> {
    const result = await this.pool.query<HonourBoardQuarterRow>(`SELECT * FROM ${this.table} WHERE site_id = $1 AND quarter = $2`, [
      siteId,
      quarter,
    ]);
    return result.rows[0] ?? null;
  }

  async setPrize(siteId: number, userId: number, quarter: HonourBoardQuarterKey, prize: HonourBoardPrizeDto): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.table} (site_id, quarter, prize_title, prize_note, updated_by)
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
      ON CONFLICT (site_id, quarter) DO UPDATE
      SET prize_title = EXCLUDED.prize_title, prize_note = EXCLUDED.prize_note, updated_at = NOW(), updated_by = EXCLUDED.updated_by
    `,
      [siteId, quarter, JSON.stringify(prize.title), JSON.stringify(prize.note), userId]
    );
  }

  async clearPrize(siteId: number, userId: number, quarter: HonourBoardQuarterKey): Promise<void> {
    await this.pool.query(
      `UPDATE ${this.table} SET prize_title = NULL, prize_note = NULL, updated_at = NOW(), updated_by = $3 WHERE site_id = $1 AND quarter = $2`,
      [siteId, quarter, userId]
    );
  }

  async setWinner(
    siteId: number,
    userId: number,
    quarter: HonourBoardQuarterKey,
    winner: { userUrn: string; pool: QuarterCount[]; threshold: number }
  ): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.table} (site_id, quarter, winner_user_urn, pool, pool_threshold, winner_chosen_at, updated_by)
      VALUES ($1, $2, $3, $4::jsonb, $5, NOW(), $6)
      ON CONFLICT (site_id, quarter) DO UPDATE
      SET winner_user_urn = EXCLUDED.winner_user_urn, pool = EXCLUDED.pool, pool_threshold = EXCLUDED.pool_threshold,
          winner_chosen_at = NOW(), updated_at = NOW(), updated_by = EXCLUDED.updated_by
    `,
      [siteId, quarter, winner.userUrn, JSON.stringify(winner.pool), winner.threshold, userId]
    );
  }
}

// ---- DTO mapping ----

// row null: nothing was set for the quarter. A prize exists once it has a title; the note may be empty.
export function toHonourBoardQuarterRecord(row: HonourBoardQuarterRow | null): QuarterRecord | null {
  if (!row) {
    return null;
  }
  return {
    prize: row.prize_title ? { title: row.prize_title, note: row.prize_note ?? {} } : null,
    winnerUrn: row.winner_user_urn,
    frozenPool: row.pool,
    frozenThreshold: row.pool_threshold,
    winnerChosenAt: row.winner_chosen_at,
  };
}
