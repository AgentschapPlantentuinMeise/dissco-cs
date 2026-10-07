import { csFetch } from './request';
import { ForumTopicDto, ForumReplyDto, ForumTopicInput } from '@dissco-cs/shared-types';

export const forumApi = {
  listTopics: () => csFetch<{ topics: ForumTopicDto[] }>('/forum/topics'),

  createTopic: (data: ForumTopicInput) =>
    csFetch<ForumTopicDto>('/forum/topics', { method: 'POST', body: JSON.stringify(data) }),

  listReplies: (topicId: number) => csFetch<ForumReplyDto[]>(`/forum/topics/${topicId}/replies`),

  createReply: (topicId: number, body: string) =>
    csFetch<ForumReplyDto>(`/forum/topics/${topicId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  visitForum: () => csFetch<void>('/forum/topics/visit', { method: 'POST' }),

  deleteTopic: (topicId: number) => csFetch<void>(`/forum/topics/${topicId}`, { method: 'DELETE' }),

  closeTopic: (topicId: number) => csFetch<ForumTopicDto>(`/forum/topics/${topicId}/close`, { method: 'POST' }),

  deleteReply: (topicId: number, replyId: number) =>
    csFetch<void>(`/forum/topics/${topicId}/replies/${replyId}`, { method: 'DELETE' }),
};
