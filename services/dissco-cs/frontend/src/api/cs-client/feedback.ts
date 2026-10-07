import { csFetch } from './request';
import { FeedbackThreadDto, FeedbackMessageDto, FeedbackThreadInput } from '@dissco-cs/shared-types';

export const feedbackApi = {
  listThreads: () => csFetch<{ threads: FeedbackThreadDto[] }>('/feedback/threads'),

  createThread: (data: FeedbackThreadInput) =>
    csFetch<FeedbackThreadDto>('/feedback/threads', { method: 'POST', body: JSON.stringify(data) }),

  getThread: (threadId: number) =>
    csFetch<{ thread: FeedbackThreadDto; messages: FeedbackMessageDto[] }>(`/feedback/threads/${threadId}`),

  createReply: (threadId: number, body: string) =>
    csFetch<FeedbackMessageDto>(`/feedback/threads/${threadId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  deleteThread: (threadId: number) =>
    csFetch<void>(`/feedback/threads/${threadId}`, { method: 'DELETE' }),
};
