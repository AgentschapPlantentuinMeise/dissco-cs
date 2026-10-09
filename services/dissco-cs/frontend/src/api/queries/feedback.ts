import { queryOptions } from '@tanstack/react-query';
import { feedbackApi } from '../cs-client/feedback';

// Shared by the dashboard and the navbar's unread badge.
export const feedbackKeys = {
  all: ['feedback'] as const,
  threads: () => [...feedbackKeys.all, 'threads'] as const,
  thread: (threadId: number) => [...feedbackKeys.all, 'thread', threadId] as const,
};

export const feedbackQueries = {
  threads: () => queryOptions({ queryKey: feedbackKeys.threads(), queryFn: () => feedbackApi.listThreads() }),
  thread: (threadId: number) => queryOptions({ queryKey: feedbackKeys.thread(threadId), queryFn: () => feedbackApi.getThread(threadId) }),
};
