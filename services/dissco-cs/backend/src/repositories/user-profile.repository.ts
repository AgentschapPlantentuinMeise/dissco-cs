import { Pool } from 'pg';
import { SitePageLang, UserProfileDto } from '@dissco-cs/shared-types';

type UserProfileRow = {
  preferred_language: SitePageLang | null;
};

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

  async get(userId: number): Promise<UserProfileRow> {
    const result = await this.pool.query<UserProfileRow>(`SELECT preferred_language FROM ${this.table} WHERE user_id = $1`, [userId]);
    return result.rows[0] ?? { preferred_language: null };
  }

  async setLanguage(userId: number, language: SitePageLang | null): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.table} (user_id, preferred_language)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET preferred_language = EXCLUDED.preferred_language, updated_at = NOW()
    `,
      [userId, language]
    );
  }

  // Forum and feedback keep a copy of the name, because it is shown with the message. Every copy of
  // this user follows a new name, on every site: the name belongs to the Madoc user.
  async syncName(userId: number, name: string): Promise<void> {
    const copies = [
      ['forum_topics', 'author_name', 'author_user_id'],
      ['forum_replies', 'author_name', 'author_user_id'],
      ['feedback_messages', 'author_name', 'author_user_id'],
      ['feedback_threads', 'reviewer_name', 'reviewer_user_id'],
      ['feedback_threads', 'recipient_name', 'recipient_user_id'],
    ];
    await Promise.all(
      copies.map(([table, nameColumn, userColumn]) =>
        this.pool.query(`UPDATE ${this.schemaRef}.${table} SET ${nameColumn} = $1 WHERE ${userColumn} = $2`, [name, userId])
      )
    );
  }
}

// ---- DTO mapping ----

export function toUserProfileDto(row: UserProfileRow): UserProfileDto {
  return { preferredLanguage: row.preferred_language };
}
