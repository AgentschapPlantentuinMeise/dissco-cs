import { Pool } from 'pg';

export type FeedbackThreadRole = 'recipient' | 'reviewer';

export type FeedbackThread = {
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
  }): Promise<FeedbackThread> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const thread = await client.query<FeedbackThread>(
        `
        INSERT INTO ${this.table('review_feedback_threads')} (
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

      // Een nieuwe reply haalt de thread terug in de lijst van de andere deelnemer als die 'm
      // eerder verborgen had (zie deleteThreadForUser) -- enkel de kolom van de niet-auteur wordt
      // gereset, de eigen kolom van de auteur (die zou sowieso al leeg moeten zijn) blijft ongemoeid.
      await client.query(
        `
        UPDATE ${this.table('review_feedback_threads')}
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

  // "Verwijderen" is per deelnemer: de eerste keer verbergt enkel je eigen kant (de ander blijft
  // de thread gewoon zien en kan nog antwoorden). Had de andere deelnemer 'm al verborgen, dan
  // willen nu beide partijen 'm weg -- dan pas een echte DELETE (cascadeert naar de berichten).
  // SELECT ... FOR UPDATE voorkomt dat twee gelijktijdige deletes elkaars hidden-kolom missen.
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
        FROM ${this.table('review_feedback_threads')}
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
        await client.query(`DELETE FROM ${this.table('review_feedback_threads')} WHERE id = $1`, [threadId]);
        await client.query('COMMIT');
        return 'deleted';
      }

      const column = isReviewer ? 'reviewer_hidden_at' : 'recipient_hidden_at';
      await client.query(`UPDATE ${this.table('review_feedback_threads')} SET ${column} = NOW() WHERE id = $1`, [threadId]);
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
      UPDATE ${this.table('review_feedback_messages')}
      SET read_at = NOW()
      WHERE thread_id = $1 AND author_user_id != $2 AND read_at IS NULL
    `,
      [threadId, userId]
    );
  }
}
