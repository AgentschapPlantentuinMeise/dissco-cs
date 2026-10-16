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

export const feedbackThreadInputSchema = z.object({
  recipientUserId: z.number().int(),
  recipientName: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  body: z.string().trim().min(1),
});
export type FeedbackThreadInput = z.infer<typeof feedbackThreadInputSchema>;

export const feedbackReplyInputSchema = z.object({ body: z.string().trim().min(1) });
