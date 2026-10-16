import { Pool } from 'pg';
import { FeedbackMessageDto, FeedbackThreadDto } from '@dissco-cs/shared-types';

export type FeedbackThreadRole = 'recipient' | 'reviewer';

export type FeedbackThreadRow = {
  id: number;
  site_id: number;
  reviewer_user_id: number;
  reviewer_name: string;
  recipient_user_id: number;
  recipient_name: string;
  subject: string;
  created_at: Date;
  last_activity: Date;
  reviewer_hidden_at: Date | null;
  recipient_hidden_at: Date | null;
};

export type FeedbackThreadWithMeta = FeedbackThreadRow & {
  role: FeedbackThreadRole;
  message_count: number;
  unread_count: number;
};

export type FeedbackMessageRow = {
  id: number;
  thread_id: number;
  author_user_id: number;
  author_name: string;
  body: string;
  read_at: Date | null;
  created_at: Date;
};

export class FeedbackRepository {
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
      FROM ${this.table('feedback_threads')} t
      LEFT JOIN ${this.table('feedback_messages')} m ON m.thread_id = t.id
      WHERE t.site_id = $1 AND (
        (t.recipient_user_id = $2 AND t.recipient_hidden_at IS NULL)
        OR (t.reviewer_user_id = $2 AND t.reviewer_hidden_at IS NULL)
      )
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
    subject: string;
    body: string;
  }): Promise<FeedbackThreadRow> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const thread = await client.query<FeedbackThreadRow>(
        `
        INSERT INTO ${this.table('feedback_threads')} (
          site_id, reviewer_user_id, reviewer_name, recipient_user_id, recipient_name, subject
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [
          input.siteId,
          input.reviewerUserId,
          input.reviewerName,
          input.recipientUserId,
          input.recipientName,
          input.subject,
        ]
      );

      await client.query(
        `
        INSERT INTO ${this.table('feedback_messages')} (
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
  ): Promise<{ thread: FeedbackThreadRow; messages: FeedbackMessageRow[] } | null> {
    const threadResult = await this.pool.query<FeedbackThreadRow>(
      `
      SELECT * FROM ${this.table('feedback_threads')}
      WHERE id = $1 AND site_id = $2 AND (recipient_user_id = $3 OR reviewer_user_id = $3)
    `,
      [threadId, siteId, userId]
    );

    const thread = threadResult.rows[0];
    if (!thread) {
      return null;
    }

    const messages = await this.pool.query<FeedbackMessageRow>(
      `
      SELECT * FROM ${this.table('feedback_messages')}
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
  }): Promise<FeedbackMessageRow | null> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const thread = await client.query(
        `
        SELECT id FROM ${this.table('feedback_threads')}
        WHERE id = $1 AND site_id = $2 AND (recipient_user_id = $3 OR reviewer_user_id = $3)
      `,
        [input.threadId, input.siteId, input.authorUserId]
      );

      if (thread.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const message = await client.query<FeedbackMessageRow>(
        `
        INSERT INTO ${this.table('feedback_messages')} (
          thread_id, author_user_id, author_name, body
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
        [input.threadId, input.authorUserId, input.authorName, input.body]
      );

      // A new message brings the thread back for the other participant if they had hidden it (see
      // deleteThreadForUser): only the other participant's hidden column is reset.
      await client.query(
        `
        UPDATE ${this.table('feedback_threads')}
        SET last_activity = NOW(),
          reviewer_hidden_at = CASE WHEN reviewer_user_id != $2 THEN NULL ELSE reviewer_hidden_at END,
          recipient_hidden_at = CASE WHEN recipient_user_id != $2 THEN NULL ELSE recipient_hidden_at END
        WHERE id = $1
      `,
        [input.threadId, input.authorUserId]
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

  // Deleting is per participant: the first delete only hides the thread for you; the other still
  // sees it and can reply. If the other had already hidden it, both want it gone, and only then is
  // it really deleted (its messages go with it). SELECT ... FOR UPDATE stops two deletes at the
  // same moment from missing each other's hidden column.
  async deleteThreadForUser(siteId: number, threadId: number, userId: number): Promise<'hidden' | 'deleted' | null> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query<{
        reviewer_user_id: number;
        recipient_user_id: number;
        reviewer_hidden_at: Date | null;
        recipient_hidden_at: Date | null;
      }>(
        `
        SELECT reviewer_user_id, recipient_user_id, reviewer_hidden_at, recipient_hidden_at
        FROM ${this.table('feedback_threads')}
        WHERE id = $1 AND site_id = $2 AND (recipient_user_id = $3 OR reviewer_user_id = $3)
        FOR UPDATE
      `,
        [threadId, siteId, userId]
      );

      const thread = result.rows[0];
      if (!thread) {
        await client.query('ROLLBACK');
        return null;
      }

      const isReviewer = thread.reviewer_user_id === userId;
      const otherAlreadyHidden = isReviewer ? thread.recipient_hidden_at !== null : thread.reviewer_hidden_at !== null;

      if (otherAlreadyHidden) {
        await client.query(`DELETE FROM ${this.table('feedback_threads')} WHERE id = $1`, [threadId]);
        await client.query('COMMIT');
        return 'deleted';
      }

      const column = isReviewer ? 'reviewer_hidden_at' : 'recipient_hidden_at';
      await client.query(`UPDATE ${this.table('feedback_threads')} SET ${column} = NOW() WHERE id = $1`, [threadId]);
      await client.query('COMMIT');
      return 'hidden';
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
      UPDATE ${this.table('feedback_messages')}
      SET read_at = NOW()
      WHERE thread_id = $1 AND author_user_id != $2 AND read_at IS NULL
    `,
      [threadId, userId]
    );
  }
}

// ---- DTO mapping ----

// Both *_hidden_at columns (the other participant's hide state) stay server-side.
export function toFeedbackThreadDto(thread: FeedbackThreadWithMeta): FeedbackThreadDto {
  return {
    id: thread.id,
    reviewerUserId: thread.reviewer_user_id,
    reviewerName: thread.reviewer_name,
    recipientUserId: thread.recipient_user_id,
    recipientName: thread.recipient_name,
    subject: thread.subject,
    createdAt: thread.created_at.toISOString(),
    lastActivity: thread.last_activity.toISOString(),
    role: thread.role,
    messageCount: thread.message_count,
    unreadCount: thread.unread_count,
  };
}

// read_at is only used server-side for unread counts.
export function toFeedbackMessageDto(row: FeedbackMessageRow): FeedbackMessageDto {
  return {
    id: row.id,
    threadId: row.thread_id,
    authorUserId: row.author_user_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at.toISOString(),
  };
}
