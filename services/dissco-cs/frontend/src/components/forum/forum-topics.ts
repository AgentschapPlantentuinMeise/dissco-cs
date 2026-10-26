import { ForumReplyDto, ForumTopicDto } from '@dissco-cs/shared-types';

export type ForumFilter = 'mine' | 'unread' | 'unanswered';
export const FORUM_FILTERS: ForumFilter[] = ['mine', 'unread', 'unanswered'];

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

export interface TopicFilterOptions {
  query: string;
  filter: ForumFilter | null;
  userId: number | undefined;
  // Only the topics about this project (ForumTopicDto.projectSlug), e.g. from /forum?project=.
  projectSlug?: string | null;
}

// The project narrows first, then the search box matches title, body, author and project, then the
// filter tab narrows further.
export function filterTopics(topics: ForumTopicDto[], { query, filter, userId, projectSlug }: TopicFilterOptions): ForumTopicDto[] {
  const inProject = projectSlug ? topics.filter(m => m.projectSlug === projectSlug) : topics;
  const q = query.trim().toLowerCase();
  const searched = q
    ? inProject.filter(
        m =>
          m.title.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          m.authorName.toLowerCase().includes(q) ||
          (m.projectLabel || '').toLowerCase().includes(q)
      )
    : inProject;

  if (filter === 'mine') return searched.filter(m => m.authorUserId === userId);
  if (filter === 'unread') return searched.filter(isUnread);
  if (filter === 'unanswered') return searched.filter(m => m.replyCount === 0);
  return searched;
}

// How many topics each filter would show with the current search (and project), for the counts on
// the filter tabs.
export function countByFilter(topics: ForumTopicDto[], options: Omit<TopicFilterOptions, 'filter'>): Record<ForumFilter, number> {
  const count = (filter: ForumFilter) => filterTopics(topics, { ...options, filter }).length;
  return { mine: count('mine'), unread: count('unread'), unanswered: count('unanswered') };
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
