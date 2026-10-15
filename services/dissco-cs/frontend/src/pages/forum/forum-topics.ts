import { ForumReplyDto, ForumTopicDto } from '@dissco-cs/shared-types';

export type ForumFilter = 'mine' | 'unread' | 'unanswered';

// Never opened, or replies arrived since the last time the user opened it.
export function isUnread(topic: ForumTopicDto): boolean {
  const seen = topic.lastSeenReplyCount;
  return seen === null || topic.replyCount > seen;
}

export function sortByLastActivity(topics: ForumTopicDto[]): ForumTopicDto[] {
  return [...topics].sort(
    (a, b) => new Date(b.lastActivity || b.createdAt).getTime() - new Date(a.lastActivity || a.createdAt).getTime()
  );
}

// The search box matches title, body, author and project; the sidebar filter narrows further.
export function filterTopics(
  topics: ForumTopicDto[],
  { query, filter, userId }: { query: string; filter: ForumFilter | null; userId: number | undefined }
): ForumTopicDto[] {
  const q = query.trim().toLowerCase();
  const searched = q
    ? topics.filter(
        m =>
          m.title.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          m.authorName.toLowerCase().includes(q) ||
          (m.projectLabel || '').toLowerCase().includes(q)
      )
    : topics;

  if (filter === 'mine') return searched.filter(m => m.authorUserId === userId);
  if (filter === 'unread') return searched.filter(isUnread);
  if (filter === 'unanswered') return searched.filter(m => m.replyCount === 0);
  return searched;
}

// The user's own reply: one more reply, and the topic counts as fully read.
export function withReplyAdded(topic: ForumTopicDto, reply: ForumReplyDto): ForumTopicDto {
  return { ...topic, replyCount: topic.replyCount + 1, lastActivity: reply.createdAt, lastSeenReplyCount: topic.replyCount + 1 };
}

export function withReplyRemoved(topic: ForumTopicDto): ForumTopicDto {
  return {
    ...topic,
    replyCount: Math.max(0, topic.replyCount - 1),
    lastSeenReplyCount: topic.lastSeenReplyCount === null ? null : Math.max(0, topic.lastSeenReplyCount - 1),
  };
}
