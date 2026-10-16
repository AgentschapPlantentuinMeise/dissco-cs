import { z } from 'zod';

export type ForumTopicDto = {
  id: number;
  authorUserId: number;
  authorName: string;
  title: string;
  taskUrl: string | null;
  projectSlug: string | null;
  projectLabel: string | null;
  body: string;
  createdAt: string;
  lastActivity: string;
  closedAt: string | null;
  replyCount: number;
  lastSeenReplyCount: number | null;
};

export type ForumReplyDto = {
  id: number;
  topicId: number;
  authorUserId: number;
  authorName: string;
  body: string;
  createdAt: string;
};

const optionalTrimmedString = z
  .string()
  .nullable()
  .optional()
  .transform(v => (v && v.trim().length > 0 ? v.trim() : null));

export const forumTopicInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  taskUrl: optionalTrimmedString,
  projectSlug: optionalTrimmedString,
  projectLabel: optionalTrimmedString,
  body: z.string().trim().min(1, 'Body is required'),
});
export type ForumTopicInput = z.infer<typeof forumTopicInputSchema>;

export const forumReplyInputSchema = z.object({ body: z.string().trim().min(1, 'Body is required') });
