import { z } from 'zod';

// Wire shape (dates as ISO strings). The API repository keeps its own local `ForumTopicRow`/
// `ForumReplyRow` row types with `Date` fields for internal use.
export type ForumTopicDto = {
  id: number;
  site_id: number;
  author_user_id: number;
  author_name: string;
  title: string;
  task_url: string | null;
  project_slug: string | null;
  project_label: string | null;
  body: string;
  created_at: string;
  last_activity: string;
  closed_at: string | null;
  reply_count: number;
  last_seen_reply_count: number | null;
};

export type ForumReplyDto = {
  id: number;
  topic_id: number;
  site_id: number;
  author_user_id: number;
  author_name: string;
  body: string;
  created_at: string;
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
export type ForumReplyInput = z.infer<typeof forumReplyInputSchema>;
