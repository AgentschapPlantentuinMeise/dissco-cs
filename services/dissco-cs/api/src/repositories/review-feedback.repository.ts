import { Pool } from 'pg';

export type FeedbackTaskRef = {
  originalTaskId: string;
  subjectLabel: unknown;
  projectSlug: string | null;
};

export type FeedbackThreadRole = 'recipient' | 'reviewer';

export type FeedbackThread = {
  id: number;
  site_id: number;
  reviewer_user_id: number;
  reviewer_name: string;
  recipient_user_id: number;
  recipient_name: string;
  tasks: FeedbackTaskRef[];
  created_at: Date;
  last_activity: Date;
};

export type FeedbackThreadWithMeta = FeedbackThread & {
  role: FeedbackThreadRole;
  message_count: number;
  unread_count: number;
};

export type FeedbackMessage = {
  id: number;
  thread_id: number;
  author_user_id: number;
  author_name: string;
  body: string;
  read_at: Date | null;
  created_at: Date;
};

export class ReviewFeedbackRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string
  ) {}

  private table(name: string): string {
    return `${this.schemaRef}.${name}`;
  }

  async listThreadsForUser(siteId: number, userId: number): Promise<FeedbackThreadWithMeta[]> {
    const result = await this.pool.query<FeedbackThreadWithMeta>(
      `
      SELECT t.*,
        CASE WHEN t.recipient_user_id = $2 THEN 'recipient' ELSE 'reviewer' END AS role,
        COUNT(m.id)::int AS message_count,
        COUNT(m.id) FILTER (WHERE m.author_user_id != $2 AND m.read_at IS NULL)::int AS unread_count
      FROM ${this.table('review_feedback_threads')} t
      LEFT JOIN ${this.table('review_feedback_messages')} m ON m.thread_id = t.id
      WHERE t.site_id = $1 AND (t.recipient_user_id = $2 OR t.reviewer_user_id = $2)
      GROUP BY t.id
      ORDER BY t.last_activity DESC
    `,
      [siteId, userId]
    );

    return result.rows;
  }

  async createThread(input: {
    siteId: number;
    reviewerUserId: number;
    reviewerName: string;
    recipientUserId: number;
    recipientName: string;
    body: string;
    tasks: FeedbackTaskRef[];
  }): Promise<FeedbackThread> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const thread = await client.query<FeedbackThread>(
        `
        INSERT INTO ${this.table('review_feedback_threads')} (
          site_id, reviewer_user_id, reviewer_name, recipient_user_id, recipient_name, tasks
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [
          input.siteId,
          input.reviewerUserId,
          input.reviewerName,
          input.recipientUserId,
          input.recipientName,
          JSON.stringify(input.tasks),
        ]
      );

      await client.query(
        `
        INSERT INTO ${this.table('review_feedback_messages')} (
          thread_id, author_user_id, author_name, body
        ) VALUES ($1, $2, $3, $4)
      `,
        [thread.rows[0].id, input.reviewerUserId, input.reviewerName, input.body]
      );

      await client.query('COMMIT');
      return thread.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getThread(
    siteId: number,
    threadId: number,
    userId: number
  ): Promise<{ thread: FeedbackThread; messages: FeedbackMessage[] } | null> {
    const threadResult = await this.pool.query<FeedbackThread>(
      `
      SELECT * FROM ${this.table('review_feedback_threads')}
      WHERE id = $1 AND site_id = $2 AND (recipient_user_id = $3 OR reviewer_user_id = $3)
    `,
      [threadId, siteId, userId]
    );

    const thread = threadResult.rows[0];
    if (!thread) {
      return null;
    }

    const messages = await this.pool.query<FeedbackMessage>(
      `
      SELECT * FROM ${this.table('review_feedback_messages')}
      WHERE thread_id = $1
      ORDER BY created_at ASC
    `,
      [threadId]
    );

    return { thread, messages: messages.rows };
  }

  async createReply(input: {
    siteId: number;
    threadId: number;
    authorUserId: number;
    authorName: string;
    body: string;
  }): Promise<FeedbackMessage | null> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const thread = await client.query(
        `
        SELECT id FROM ${this.table('review_feedback_threads')}
        WHERE id = $1 AND site_id = $2 AND (recipient_user_id = $3 OR reviewer_user_id = $3)
      `,
        [input.threadId, input.siteId, input.authorUserId]
      );

      if (thread.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const message = await client.query<FeedbackMessage>(
        `
        INSERT INTO ${this.table('review_feedback_messages')} (
          thread_id, author_user_id, author_name, body
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
        [input.threadId, input.authorUserId, input.authorName, input.body]
      );

      await client.query(
        `UPDATE ${this.table('review_feedback_threads')} SET last_activity = NOW() WHERE id = $1`,
        [input.threadId]
      );

      await client.query('COMMIT');
      return message.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markThreadSeen(userId: number, threadId: number): Promise<void> {
    await this.pool.query(
      `
      UPDATE ${this.table('review_feedback_messages')}
      SET read_at = NOW()
      WHERE thread_id = $1 AND author_user_id != $2 AND read_at IS NULL
    `,
      [threadId, userId]
    );
  }
}
