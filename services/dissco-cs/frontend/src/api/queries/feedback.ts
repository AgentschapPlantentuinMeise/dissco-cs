import { queryOptions } from '@tanstack/react-query';
import { feedbackApi } from '../cs-client/feedback';
import { LIVE } from './freshness';

export const feedbackKeys = {
  all: ['feedback'] as const,
  threads: () => [...feedbackKeys.all, 'threads'] as const,
  // Under threads, so every invalidation of the threads also refreshes the navbar badge.
  unreadCount: () => [...feedbackKeys.threads(), 'unread-count'] as const,
  thread: (threadId: number) => [...feedbackKeys.all, 'thread', threadId] as const,
};

export const feedbackQueries = {
  threads: () => queryOptions({ queryKey: feedbackKeys.threads(), queryFn: () => feedbackApi.listThreads(), ...LIVE }),
  unreadCount: () => queryOptions({ queryKey: feedbackKeys.unreadCount(), queryFn: () => feedbackApi.unreadCount(), ...LIVE }),
  thread: (threadId: number) => queryOptions({ queryKey: feedbackKeys.thread(threadId), queryFn: () => feedbackApi.getThread(threadId), ...LIVE }),
};
