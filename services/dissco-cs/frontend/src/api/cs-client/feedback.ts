import { csFetch, csFetchField } from './request';
import { FeedbackThreadDto, FeedbackMessageDto, FeedbackThreadInput } from '@dissco-cs/shared-types';

export const feedbackApi = {
  /**
   * The caller's feedback threads (as reviewer or as recipient), most recent activity first,
   * without the ones the caller deleted. Each with its unread count for the caller.
   * Input: none.
   * Who: logged-in user.
   * Returns: FeedbackThreadDto[].
   */
  listThreads: () => csFetchField<FeedbackThreadDto[]>('/feedback/threads', 'threads'),

  /**
   * Starts a feedback thread from the caller (as reviewer) to a volunteer, with a first message.
   * @param data recipientUserId and recipientName of the volunteer; subject and body, not empty.
   *   Validated by feedbackThreadInputSchema.
   * Who: reviewer or site admin.
   * Returns: the new FeedbackThreadDto (201); 403 not a reviewer.
   */
  createThread: (data: FeedbackThreadInput) =>
    csFetch<FeedbackThreadDto>('/feedback/threads', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * One thread with all its messages, oldest first. Also marks the other participant's messages
   * as read for the caller.
   * @param threadId id of the thread (FeedbackThreadDto.id)
   * Who: one of the two participants.
   * Returns: { thread, messages }; 404 unknown thread or not a participant.
   */
  getThread: (threadId: number) =>
    csFetch<{ thread: FeedbackThreadDto; messages: FeedbackMessageDto[] }>(`/feedback/threads/${threadId}`),

  /**
   * Adds a message in the caller's name. The thread reappears for the other participant if they
   * had deleted it, and counts as read for the caller.
   * @param threadId id of the thread (FeedbackThreadDto.id)
   * @param body the message text, not empty. Validated by feedbackReplyInputSchema.
   * Who: one of the two participants.
   * Returns: the new FeedbackMessageDto (201); 404 unknown thread or not a participant.
   */
  createReply: (threadId: number, body: string) =>
    csFetch<FeedbackMessageDto>(`/feedback/threads/${threadId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  /**
   * Deletes a thread for the caller only: the other participant still sees it. Once both have
   * deleted it, the thread and its messages are removed for good.
   * @param threadId id of the thread (FeedbackThreadDto.id)
   * Who: one of the two participants.
   * Returns: nothing (204); 404 unknown thread or not a participant.
   */
  deleteThread: (threadId: number) =>
    csFetch<void>(`/feedback/threads/${threadId}`, { method: 'DELETE' }),
};
