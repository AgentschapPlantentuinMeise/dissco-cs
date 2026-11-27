import { queryOptions } from '@tanstack/react-query';
import { forumApi } from '../cs-client/forum';
import { LIVE } from './freshness';

export const forumKeys = {
  all: ['forum'] as const,
  topics: () => [...forumKeys.all, 'topics'] as const,
  // Under topics, so invalidating the topics also refreshes a project's list.
  projectTopics: (projectSlug: string) => [...forumKeys.topics(), 'project', projectSlug] as const,
  replies: (topicId: number | null) => [...forumKeys.all, 'replies', topicId] as const,
  counts: () => [...forumKeys.all, 'counts'] as const,
};

export const forumQueries = {
  topics: () => queryOptions({ queryKey: forumKeys.topics(), queryFn: () => forumApi.listTopics(), ...LIVE }),

  // The latest questions on a project page: only that project's topics, not the whole forum.
  projectTopics: (projectSlug: string) =>
    queryOptions({ queryKey: forumKeys.projectTopics(projectSlug), queryFn: () => forumApi.listTopics(projectSlug), ...LIVE }),

  // The navbar badge (unread) and the dashboard (unanswered), counted on the server. Deliberately
  // under its own key: the forum page keeps showing the unread markers it opened with, while
  // visiting it already marks topics seen on the server -- the forum page invalidates only this key
  // after such changes, so the badge follows the server state without wiping the markers on the page.
  counts: () => queryOptions({ queryKey: forumKeys.counts(), queryFn: () => forumApi.counts(), ...LIVE }),

  replies: (topicId: number | null) =>
    queryOptions({ queryKey: forumKeys.replies(topicId), queryFn: () => forumApi.listReplies(topicId!), enabled: topicId !== null, ...LIVE }),
};
