import { Pool } from 'pg';
import { SitePageLang } from './site-pages.repository.js';

export const ANNOUNCEMENT_TARGET_TYPES = ['homepage', 'projects', 'project'] as const;
export type AnnouncementTargetType = (typeof ANNOUNCEMENT_TARGET_TYPES)[number];

export type Announcement = {
  id: string;
  site_id: number;
  title: Partial<Record<SitePageLang, string>>;
  description: Partial<Record<SitePageLang, string>>;
  target_type: AnnouncementTargetType;
  target_project_slug: string | null;
  is_active: boolean;
  start_date: Date | null;
  end_date: Date | null;
  created_at: Date;
};

export class AnnouncementsRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string
  ) {}

  private table(name: string): string {
    return `${this.schemaRef}.${name}`;
  }

  async listAnnouncements(siteId: number): Promise<Announcement[]> {
    const result = await this.pool.query<Announcement>(
      `SELECT * FROM ${this.table('announcements')} WHERE site_id = $1 ORDER BY created_at DESC`,
      [siteId]
    );

    return result.rows;
  }

  async listActiveAnnouncements(
    siteId: number,
    targetType: AnnouncementTargetType,
    targetProjectSlug: string | null
  ): Promise<Announcement[]> {
    const result = await this.pool.query<Announcement>(
      `
      SELECT * FROM ${this.table('announcements')}
      WHERE site_id = $1
        AND is_active = TRUE
        AND target_type = $2
        AND (target_project_slug = $3 OR ($3 IS NULL AND target_project_slug IS NULL))
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
      ORDER BY created_at DESC
    `,
      [siteId, targetType, targetProjectSlug]
    );

    return result.rows;
  }

  async createAnnouncement(input: {
    siteId: number;
    title: Partial<Record<SitePageLang, string>>;
    description: Partial<Record<SitePageLang, string>>;
    targetType: AnnouncementTargetType;
    targetProjectSlug: string | null;
    isActive: boolean;
    startDate: string | null;
    endDate: string | null;
  }): Promise<Announcement> {
    const result = await this.pool.query<Announcement>(
      `
      INSERT INTO ${this.table('announcements')} (
        site_id, title, description, target_type, target_project_slug, is_active, start_date, end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        input.siteId,
        JSON.stringify(input.title),
        JSON.stringify(input.description),
        input.targetType,
        input.targetProjectSlug,
        input.isActive,
        input.startDate,
        input.endDate,
      ]
    );

    return result.rows[0];
  }

  async updateAnnouncement(
    siteId: number,
    id: number,
    input: {
      title: Partial<Record<SitePageLang, string>>;
      description: Partial<Record<SitePageLang, string>>;
      targetType: AnnouncementTargetType;
      targetProjectSlug: string | null;
      isActive: boolean;
      startDate: string | null;
      endDate: string | null;
    }
  ): Promise<Announcement | null> {
    const result = await this.pool.query<Announcement>(
      `
      UPDATE ${this.table('announcements')}
      SET title = $3, description = $4, target_type = $5, target_project_slug = $6,
          is_active = $7, start_date = $8, end_date = $9, created_at = NOW()
      WHERE id = $1 AND site_id = $2
      RETURNING *
    `,
      [
        id,
        siteId,
        JSON.stringify(input.title),
        JSON.stringify(input.description),
        input.targetType,
        input.targetProjectSlug,
        input.isActive,
        input.startDate,
        input.endDate,
      ]
    );

    return result.rows[0] ?? null;
  }

  async deleteAnnouncement(siteId: number, id: number): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM ${this.table('announcements')} WHERE id = $1 AND site_id = $2`,
      [id, siteId]
    );

    return (result.rowCount ?? 0) > 0;
  }
}
