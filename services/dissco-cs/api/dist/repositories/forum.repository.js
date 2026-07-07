export class ForumRepository {
    pool;
    schemaRef;
    constructor(pool, schemaRef) {
        this.pool = pool;
        this.schemaRef = schemaRef;
    }
    table(name) {
        return `${this.schemaRef}.${name}`;
    }
    async listTopics(siteId, userId) {
        const result = await this.pool.query(`
      SELECT t.*, COUNT(r.id)::int AS reply_count,
        rs.last_seen_reply_count AS last_seen_reply_count
      FROM ${this.table('forum_topics')} t
      LEFT JOIN ${this.table('forum_replies')} r ON r.topic_id = t.id
      LEFT JOIN ${this.table('forum_read_state')} rs ON rs.topic_id = t.id AND rs.user_id = $2
      WHERE t.site_id = $1
      GROUP BY t.id, rs.last_seen_reply_count
      ORDER BY t.last_activity DESC
    `, [siteId, userId]);
        return result.rows;
    }
    async createTopic(input) {
        const result = await this.pool.query(`
      INSERT INTO ${this.table('forum_topics')} (
        site_id, author_user_id, author_name, title, task_url, body
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [input.siteId, input.authorUserId, input.authorName, input.title, input.taskUrl, input.body]);
        return result.rows[0];
    }
    async getTopic(siteId, topicId) {
        const result = await this.pool.query(`SELECT * FROM ${this.table('forum_topics')} WHERE id = $1 AND site_id = $2`, [topicId, siteId]);
        return result.rows[0] ?? null;
    }
    async listReplies(siteId, topicId) {
        const result = await this.pool.query(`
      SELECT * FROM ${this.table('forum_replies')}
      WHERE topic_id = $1 AND site_id = $2
      ORDER BY created_at ASC
    `, [topicId, siteId]);
        return result.rows;
    }
    async createReply(input) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const topic = await client.query(`SELECT id FROM ${this.table('forum_topics')} WHERE id = $1 AND site_id = $2`, [input.topicId, input.siteId]);
            if (topic.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }
            const reply = await client.query(`
        INSERT INTO ${this.table('forum_replies')} (
          topic_id, site_id, author_user_id, author_name, body
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [input.topicId, input.siteId, input.authorUserId, input.authorName, input.body]);
            await client.query(`UPDATE ${this.table('forum_topics')} SET last_activity = NOW() WHERE id = $1`, [input.topicId]);
            await client.query('COMMIT');
            return reply.rows[0];
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async deleteTopic(siteId, topicId) {
        const result = await this.pool.query(`DELETE FROM ${this.table('forum_topics')} WHERE id = $1 AND site_id = $2`, [topicId, siteId]);
        return (result.rowCount ?? 0) > 0;
    }
    async markAllEmptyTopicsSeen(siteId, userId) {
        await this.pool.query(`
      INSERT INTO ${this.table('forum_read_state')} (user_id, topic_id, last_seen_reply_count)
      SELECT $2, t.id, 0
      FROM ${this.table('forum_topics')} t
      LEFT JOIN ${this.table('forum_replies')} r ON r.topic_id = t.id
      WHERE t.site_id = $1
      GROUP BY t.id
      HAVING COUNT(r.id) = 0
      ON CONFLICT (user_id, topic_id) DO NOTHING
    `, [siteId, userId]);
    }
    async markTopicSeen(userId, topicId, replyCount) {
        await this.pool.query(`
      INSERT INTO ${this.table('forum_read_state')} (user_id, topic_id, last_seen_reply_count)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, topic_id) DO UPDATE
      SET last_seen_reply_count = EXCLUDED.last_seen_reply_count, updated_at = NOW()
      WHERE ${this.table('forum_read_state')}.last_seen_reply_count < EXCLUDED.last_seen_reply_count
    `, [userId, topicId, replyCount]);
    }
}
