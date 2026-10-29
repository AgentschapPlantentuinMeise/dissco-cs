import { z } from 'zod';
import { MAX_PROJECT_SLUG_LENGTH } from './common.js';

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

export const MAX_FORUM_TITLE_LENGTH = 200;
// The annotation page's own URL (project slug, manifest and canvas ids, a query string).
export const MAX_FORUM_TASK_URL_LENGTH = 500;
export const MAX_FORUM_PROJECT_LABEL_LENGTH = 200;
export const MAX_FORUM_BODY_LENGTH = 10_000;

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform(v => v || null);

const forumBodySchema = z.string().trim().min(1, 'Body is required').max(MAX_FORUM_BODY_LENGTH);

export const forumTopicInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(MAX_FORUM_TITLE_LENGTH),
  taskUrl: optionalTrimmedString(MAX_FORUM_TASK_URL_LENGTH),
  projectSlug: optionalTrimmedString(MAX_PROJECT_SLUG_LENGTH),
  projectLabel: optionalTrimmedString(MAX_FORUM_PROJECT_LABEL_LENGTH),
  body: forumBodySchema,
});
export type ForumTopicInput = z.infer<typeof forumTopicInputSchema>;

export const forumReplyInputSchema = z.object({ body: forumBodySchema });
