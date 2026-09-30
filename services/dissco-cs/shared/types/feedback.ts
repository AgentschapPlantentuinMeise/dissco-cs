import { z } from 'zod';

export type FeedbackThreadRole = 'recipient' | 'reviewer';

// Wire shape (dates as ISO strings). The API repository keeps its own local `FeedbackThreadRow`/
// `FeedbackMessageRow` row types with `Date` fields for internal use. `role`/`message_count`/
// `unread_count` are always computed relative to the requesting user -- every route that returns
// a thread is responsible for supplying accurate values, not just the list endpoint.
export type FeedbackThreadDto = {
  id: number;
  site_id: number;
  reviewer_user_id: number;
  reviewer_name: string;
  recipient_user_id: number;
  recipient_name: string;
  subject: string;
  created_at: string;
  last_activity: string;
  reviewer_hidden_at: string | null;
  recipient_hidden_at: string | null;
  role: FeedbackThreadRole;
  message_count: number;
  unread_count: number;
};

export type FeedbackMessageDto = {
  id: number;
  thread_id: number;
  author_user_id: number;
  author_name: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export const feedbackThreadInputSchema = z.object({
  recipientUserId: z.number().int(),
  recipientName: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  body: z.string().trim().min(1),
});
export type FeedbackThreadInput = z.infer<typeof feedbackThreadInputSchema>;

export const feedbackReplyInputSchema = z.object({ body: z.string().trim().min(1) });
export type FeedbackReplyInput = z.infer<typeof feedbackReplyInputSchema>;
