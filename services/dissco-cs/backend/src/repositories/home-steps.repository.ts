import { Pool } from 'pg';
import { HomeStepDto, MultilingualText } from '@dissco-cs/shared-types';

// One element of the steps column: the JSON written by replace().
type HomeStepJson = { title: MultilingualText; body: MultilingualText };

export class HomeStepsRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string
  ) {}

  private get table(): string {
    return `${this.schemaRef}.home_steps`;
  }

  async list(siteId: number): Promise<HomeStepJson[]> {
    const result = await this.pool.query<{ steps: HomeStepJson[] }>(`SELECT steps FROM ${this.table} WHERE site_id = $1`, [siteId]);
    return result.rows[0]?.steps ?? [];
  }

  async replace(siteId: number, steps: HomeStepJson[]): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.table} (site_id, steps)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (site_id) DO UPDATE SET steps = EXCLUDED.steps, updated_at = NOW()
    `,
      [siteId, JSON.stringify(steps)]
    );
  }
}

// ---- DTO mapping ----

export function toHomeStepDto(step: HomeStepJson): HomeStepDto {
  return { title: step.title, body: step.body };
}
