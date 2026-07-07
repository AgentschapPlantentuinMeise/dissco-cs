export const ANNOUNCEMENT_TARGET_TYPES = ['homepage', 'projects', 'project'];
export class AnnouncementsRepository {
    pool;
    schemaRef;
    constructor(pool, schemaRef) {
        this.pool = pool;
        this.schemaRef = schemaRef;
    }
    table(name) {
        return `${this.schemaRef}.${name}`;
    }
    async listAnnouncements(siteId) {
        const result = await this.pool.query(`SELECT * FROM ${this.table('announcements')} WHERE site_id = $1 ORDER BY created_at DESC`, [siteId]);
        return result.rows;
    }
    async listActiveAnnouncements(siteId, targetType, targetProjectSlug) {
        const result = await this.pool.query(`
      SELECT * FROM ${this.table('announcements')}
      WHERE site_id = $1
        AND is_active = TRUE
        AND target_type = $2
        AND (target_project_slug = $3 OR ($3 IS NULL AND target_project_slug IS NULL))
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
      ORDER BY created_at DESC
    `, [siteId, targetType, targetProjectSlug]);
        return result.rows;
    }
    async createAnnouncement(input) {
        const result = await this.pool.query(`
      INSERT INTO ${this.table('announcements')} (
        site_id, title, description, target_type, target_project_slug, is_active, start_date, end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
            input.siteId,
            input.title,
            input.description,
            input.targetType,
            input.targetProjectSlug,
            input.isActive,
            input.startDate,
            input.endDate,
        ]);
        return result.rows[0];
    }
    async updateAnnouncement(siteId, id, input) {
        const result = await this.pool.query(`
      UPDATE ${this.table('announcements')}
      SET title = $3, description = $4, target_type = $5, target_project_slug = $6,
          is_active = $7, start_date = $8, end_date = $9
      WHERE id = $1 AND site_id = $2
      RETURNING *
    `, [
            id,
            siteId,
            input.title,
            input.description,
            input.targetType,
            input.targetProjectSlug,
            input.isActive,
            input.startDate,
            input.endDate,
        ]);
        return result.rows[0] ?? null;
    }
    async deleteAnnouncement(siteId, id) {
        const result = await this.pool.query(`DELETE FROM ${this.table('announcements')} WHERE id = $1 AND site_id = $2`, [id, siteId]);
        return (result.rowCount ?? 0) > 0;
    }
}
