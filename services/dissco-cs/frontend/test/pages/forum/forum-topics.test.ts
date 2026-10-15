import { describe, expect, it } from 'vitest';
import { ForumReplyDto, ForumTopicDto } from '@dissco-cs/shared-types';

import { filterTopics, isUnread, sortByLastActivity, withReplyAdded, withReplyRemoved } from '../../../src/pages/forum/forum-topics';

function topic(overrides: Partial<ForumTopicDto>): ForumTopicDto {
  return {
    id: 1,
    authorUserId: 10,
    authorName: 'Ann',
    title: 'Question',
    taskUrl: null,
    projectSlug: null,
    projectLabel: null,
    body: 'Body',
    createdAt: '2026-01-01T00:00:00Z',
    lastActivity: '2026-01-01T00:00:00Z',
    closedAt: null,
    replyCount: 0,
    lastSeenReplyCount: 0,
    ...overrides,
  };
}

describe('isUnread', () => {
  it('is unread when never opened', () => {
    expect(isUnread(topic({ lastSeenReplyCount: null }))).toBe(true);
  });

  it('is unread when replies arrived since the last visit', () => {
    expect(isUnread(topic({ replyCount: 3, lastSeenReplyCount: 2 }))).toBe(true);
  });

  it('is read when all replies were seen', () => {
    expect(isUnread(topic({ replyCount: 2, lastSeenReplyCount: 2 }))).toBe(false);
  });
});

describe('sortByLastActivity', () => {
  it('puts the most recent activity first and does not mutate the input', () => {
    const old = topic({ id: 1, lastActivity: '2026-01-01T00:00:00Z' });
    const recent = topic({ id: 2, lastActivity: '2026-03-01T00:00:00Z' });
    const input = [old, recent];
    expect(sortByLastActivity(input).map(t => t.id)).toEqual([2, 1]);
    expect(input.map(t => t.id)).toEqual([1, 2]);
  });
});

describe('filterTopics', () => {
  const topics = [
    topic({ id: 1, title: 'Herbarium labels', authorUserId: 10, replyCount: 0 }),
    topic({ id: 2, body: 'About the herbarium', authorUserId: 20, replyCount: 2, lastSeenReplyCount: 2 }),
    topic({ id: 3, authorName: 'Herbert', authorUserId: 20, replyCount: 1, lastSeenReplyCount: 0 }),
    topic({ id: 4, projectLabel: 'Fungi', authorUserId: 10, replyCount: 1, lastSeenReplyCount: 1 }),
  ];
  const ids = (list: ForumTopicDto[]) => list.map(t => t.id);

  it('searches title, body, author and project, case-insensitively', () => {
    expect(ids(filterTopics(topics, { query: ' HERB ', filter: null, userId: 10 }))).toEqual([1, 2, 3]);
    expect(ids(filterTopics(topics, { query: 'fungi', filter: null, userId: 10 }))).toEqual([4]);
  });

  it('applies the sidebar filters', () => {
    expect(ids(filterTopics(topics, { query: '', filter: 'mine', userId: 10 }))).toEqual([1, 4]);
    expect(ids(filterTopics(topics, { query: '', filter: 'unread', userId: 10 }))).toEqual([3]);
    expect(ids(filterTopics(topics, { query: '', filter: 'unanswered', userId: 10 }))).toEqual([1]);
  });

  it('combines search and filter', () => {
    expect(ids(filterTopics(topics, { query: 'herb', filter: 'mine', userId: 20 }))).toEqual([2, 3]);
  });
});

describe('reply counters', () => {
  const reply: ForumReplyDto = { id: 9, topicId: 1, authorUserId: 10, authorName: 'Ann', body: 'Hi', createdAt: '2026-05-01T00:00:00Z' };

  it('adding a reply bumps the count and marks the topic read', () => {
    const result = withReplyAdded(topic({ replyCount: 2, lastSeenReplyCount: 1 }), reply);
    expect(result).toMatchObject({ replyCount: 3, lastSeenReplyCount: 3, lastActivity: reply.createdAt });
  });

  it('removing a reply never goes below zero and keeps never-seen as null', () => {
    expect(withReplyRemoved(topic({ replyCount: 2, lastSeenReplyCount: 2 }))).toMatchObject({ replyCount: 1, lastSeenReplyCount: 1 });
    expect(withReplyRemoved(topic({ replyCount: 0, lastSeenReplyCount: 0 }))).toMatchObject({ replyCount: 0, lastSeenReplyCount: 0 });
    expect(withReplyRemoved(topic({ replyCount: 1, lastSeenReplyCount: null })).lastSeenReplyCount).toBeNull();
  });
});
