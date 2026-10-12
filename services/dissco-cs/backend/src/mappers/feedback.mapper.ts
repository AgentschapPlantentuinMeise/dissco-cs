import { FeedbackMessageDto, FeedbackThreadDto } from '@dissco-cs/shared-types';
import { FeedbackMessageRow, FeedbackThreadWithMeta } from '../repositories/feedback.repository.js';

// site_id and both *_hidden_at columns (the other participant's hide state) stay server-side.
export function toFeedbackThreadDto(thread: FeedbackThreadWithMeta): FeedbackThreadDto {
  return {
    id: thread.id,
    reviewer_user_id: thread.reviewer_user_id,
    reviewer_name: thread.reviewer_name,
    recipient_user_id: thread.recipient_user_id,
    recipient_name: thread.recipient_name,
    subject: thread.subject,
    created_at: thread.created_at.toISOString(),
    last_activity: thread.last_activity.toISOString(),
    role: thread.role,
    message_count: thread.message_count,
    unread_count: thread.unread_count,
  };
}

// read_at is only used server-side for unread counts.
export function toFeedbackMessageDto(row: FeedbackMessageRow): FeedbackMessageDto {
  return {
    id: row.id,
    thread_id: row.thread_id,
    author_user_id: row.author_user_id,
    author_name: row.author_name,
    body: row.body,
    created_at: row.created_at.toISOString(),
  };
}
