import { queryOptions } from '@tanstack/react-query';
import { forumApi } from '../cs-client/forum';

export const forumKeys = {
  all: ['forum'] as const,
  topics: () => [...forumKeys.all, 'topics'] as const,
  replies: (topicId: number | null) => [...forumKeys.all, 'replies', topicId] as const,
  unreadCount: () => [...forumKeys.all, 'unread-count'] as const,
};

export const forumQueries = {
  // Shared by the forum page and the dashboard widget.
  topics: () => queryOptions({ queryKey: forumKeys.topics(), queryFn: () => forumApi.listTopics() }),

  // The navbar badge, deliberately under its own key: the forum page keeps showing the unread
  // markers it opened with, while visiting it already marks topics seen on the server -- the forum
  // page invalidates only this key after such changes, so the badge follows the server state
  // without wiping the markers on the page itself.
  unreadCount: () =>
    queryOptions({
      queryKey: forumKeys.unreadCount(),
      queryFn: async () => {
        const { topics } = await forumApi.listTopics();
        return topics.filter(m => m.last_seen_reply_count === null || m.reply_count > m.last_seen_reply_count).length;
      },
    }),

  replies: (topicId: number | null) =>
    queryOptions({ queryKey: forumKeys.replies(topicId), queryFn: () => forumApi.listReplies(topicId!), enabled: topicId !== null }),
};
