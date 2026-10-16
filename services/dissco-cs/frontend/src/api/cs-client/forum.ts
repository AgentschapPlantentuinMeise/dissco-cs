import { csFetch } from './request';
import { ForumTopicDto, ForumReplyDto, ForumTopicInput } from '@dissco-cs/shared-types';

export const forumApi = {
  /**
   * All topics of this site, most recent activity first, each with its reply count and how many
   * replies the caller has seen (null = never opened).
   * Input: none.
   * Who: logged-in user.
   * Returns: { topics: ForumTopicDto[] }.
   */
  listTopics: () => csFetch<{ topics: ForumTopicDto[] }>('/forum/topics'),

  /**
   * Creates a topic in the caller's name; it counts as read for the caller.
   * @param data title and body required (not empty); taskUrl, projectSlug and projectLabel
   *   optional (empty becomes null). Validated by forumTopicInputSchema.
   * Who: logged-in user.
   * Returns: the new ForumTopicDto (201).
   */
  createTopic: (data: ForumTopicInput) =>
    csFetch<ForumTopicDto>('/forum/topics', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Replies of a topic, oldest first. Also marks all of them as read for the caller.
   * @param topicId id of the topic (ForumTopicDto.id)
   * Who: logged-in user.
   * Returns: ForumReplyDto[]; 404 when the topic is not on this site.
   */
  listReplies: (topicId: number) => csFetch<ForumReplyDto[]>(`/forum/topics/${topicId}/replies`),

  /**
   * Adds a reply in the caller's name; the topic then counts as fully read for the caller.
   * @param topicId id of the topic (ForumTopicDto.id)
   * @param body the reply text, not empty. Validated by forumReplyInputSchema.
   * Who: logged-in user.
   * Returns: the new ForumReplyDto (201); 404 unknown topic; 403 when the topic is closed.
   */
  createReply: (topicId: number, body: string) =>
    csFetch<ForumReplyDto>(`/forum/topics/${topicId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  /**
   * Records a visit to the forum page: every topic without replies counts as read for the caller
   * from now on (topics with replies only become read by opening them).
   * Input: none.
   * Who: logged-in user.
   * Returns: nothing (204).
   */
  visitForum: () => csFetch<void>('/forum/topics/visit', { method: 'POST' }),

  /**
   * Deletes a topic with all its replies.
   * @param topicId id of the topic (ForumTopicDto.id)
   * Who: the topic's author or a site admin.
   * Returns: nothing (204); 404 unknown topic; 403 not allowed.
   */
  deleteTopic: (topicId: number) => csFetch<void>(`/forum/topics/${topicId}`, { method: 'DELETE' }),

  /**
   * Closes a topic: it stays visible but takes no new replies.
   * @param topicId id of the topic (ForumTopicDto.id)
   * Who: the topic's author or a site admin.
   * Returns: the topic as ForumTopicDto, with its closedAt; 404 unknown topic; 403 not allowed.
   */
  closeTopic: (topicId: number) => csFetch<ForumTopicDto>(`/forum/topics/${topicId}/close`, { method: 'POST' }),

  /**
   * Deletes one reply.
   * @param topicId id of the topic the reply belongs to (ForumTopicDto.id)
   * @param replyId id of the reply (ForumReplyDto.id)
   * Who: the reply's author or a site admin.
   * Returns: nothing (204); 404 when the reply is not part of that topic; 403 not allowed.
   */
  deleteReply: (topicId: number, replyId: number) =>
    csFetch<void>(`/forum/topics/${topicId}/replies/${replyId}`, { method: 'DELETE' }),
};
