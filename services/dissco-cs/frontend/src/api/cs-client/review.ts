import { csFetch, csFetchField } from './request';
import { urlPath } from '../url';
import { ReviewTaskDto } from '@dissco-cs/shared-types';

export const reviewApi = {
  /**
   * Every still-open review task of the site (status 0 not started, 1 to handle, 2 in review),
   * across all projects, with the assigned reviewer.
   * Input: none.
   * Who: reviewer or site admin.
   * Returns: ReviewTaskDto[]; 403 not a reviewer.
   */
  listTasks: () => csFetchField<ReviewTaskDto[]>('/review/tasks', 'tasks'),

  /**
   * Whether the caller has the site role 'reviewer'. A site admin gets false here unless that is
   * also their role -- callers treat admins as reviewers themselves.
   * Input: none.
   * Who: logged-in user.
   * Returns: boolean.
   */
  isReviewer: () => csFetchField<boolean>('/review/is-reviewer', 'isReviewer'),

  /**
   * Accepts or rejects a submission through madoc-ts's own crowdsourcing task route, not the
   * generic tasks-api update: on accept it runs Madoc's extra checks (e.g. blocks on flagged
   * table cells).
   * @param taskId the review task's id (Madoc task id)
   * @param task the change, passed on to Madoc unchecked: accept = { status: 3, status_text:
   *   'Approved', state: { changesRequested: '' } }, reject = { status: -1, status_text: 'Rejected' }
   * Who: the reviewer of the task -- Madoc checks this with the caller's own token.
   * Returns: Madoc's answer, status passed through unchanged.
   */
  updateTask: (taskId: string, task: Record<string, unknown>) =>
    csFetch<void>(urlPath`/review/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ task }) }),
};
