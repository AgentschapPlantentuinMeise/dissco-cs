// Wire shape (dates as ISO strings). The API repository keeps its own local `ForumTopic`/
// `ForumReply` row types with `Date` fields for internal use.
export type ForumTopic = {
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
};

export type ForumTopicWithReplyCount = ForumTopic & { reply_count: number; last_seen_reply_count: number | null };

export type ForumReply = {
  id: number;
  topic_id: number;
  site_id: number;
  author_user_id: number;
  author_name: string;
  body: string;
  created_at: string;
};

export type ForumTopicWithReplies = ForumTopic & { replies: ForumReply[] };
