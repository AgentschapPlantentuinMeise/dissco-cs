import { csFetch } from './request';
import { ReviewTaskDto } from '@dissco-cs/shared-types';

export const reviewApi = {
  getReviewTasks: () => csFetch<{ tasks: ReviewTaskDto[] }>('/review/tasks'),

  isReviewer: () => csFetch<{ isReviewer: boolean }>('/review/is-reviewer'),

  // Accept/reject a submission via madoc-ts's own crowdsourcing task route, not the generic
  // tasks-api update -- it carries extra domain logic on accept (e.g. flagged table cells).
  updateTask: (taskId: string, task: Record<string, unknown>) =>
    csFetch<void>(`/review/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ task }) }),
};
