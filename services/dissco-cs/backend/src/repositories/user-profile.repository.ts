import { Pool } from 'pg';

export class UserProfileRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string
  ) {}

  private get table(): string {
    return `${this.schemaRef}.user_profile`;
  }

  // Creates the profile on a first visit. After that last_seen_at changes at most once a day: a
  // retention period counts in years, so a write on every page load would add nothing.
  async recordVisit(userId: number): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.table} (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO UPDATE SET last_seen_at = NOW()
      WHERE user_profile.last_seen_at < date_trunc('day', NOW())
    `,
      [userId]
    );
  }
}
