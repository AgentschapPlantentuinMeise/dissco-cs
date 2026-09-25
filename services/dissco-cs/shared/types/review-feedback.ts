export type FeedbackThreadRole = 'recipient' | 'reviewer';

// Wire shape (dates as ISO strings). The API repository keeps its own local `FeedbackThread`/
// `FeedbackMessage` row types with `Date` fields for internal use.
export type FeedbackThread = {
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
  read_at: string | null;
  created_at: string;
};
