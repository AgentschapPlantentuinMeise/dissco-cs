import { z } from 'zod';

export type FeedbackThreadRole = 'recipient' | 'reviewer';

// role, messageCount and unreadCount depend on who asks: they are computed for the requesting
// user. Every route that returns a thread must fill them in for that user, not only the list.
export type FeedbackThreadDto = {
  id: number;
  reviewerUserId: number;
  reviewerName: string;
  recipientUserId: number;
  recipientName: string;
  subject: string;
  createdAt: string;
  lastActivity: string;
  role: FeedbackThreadRole;
  messageCount: number;
  unreadCount: number;
};

export type FeedbackMessageDto = {
  id: number;
  threadId: number;
  authorUserId: number;
  authorName: string;
  body: string;
  createdAt: string;
};

export const MAX_FEEDBACK_SUBJECT_LENGTH = 200;
export const MAX_FEEDBACK_BODY_LENGTH = 10_000;
// The recipient's Madoc name. Madoc itself sets no limit, so this only stops a request that sends
// something absurd; it is not a rule for names.
export const MAX_FEEDBACK_RECIPIENT_NAME_LENGTH = 255;

const feedbackBodySchema = z.string().trim().min(1).max(MAX_FEEDBACK_BODY_LENGTH);

export const feedbackThreadInputSchema = z.object({
  recipientUserId: z.number().int(),
  recipientName: z.string().trim().min(1).max(MAX_FEEDBACK_RECIPIENT_NAME_LENGTH),
  subject: z.string().trim().min(1).max(MAX_FEEDBACK_SUBJECT_LENGTH),
  body: feedbackBodySchema,
});
export type FeedbackThreadInput = z.infer<typeof feedbackThreadInputSchema>;

export const feedbackReplyInputSchema = z.object({ body: feedbackBodySchema });
