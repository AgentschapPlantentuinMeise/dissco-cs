import { queryOptions } from '@tanstack/react-query';
import { reviewApi } from '../cs-client/review';

export const reviewKeys = {
  all: ['review'] as const,
  isReviewer: () => [...reviewKeys.all, 'is-reviewer'] as const,
  tasks: () => [...reviewKeys.all, 'tasks'] as const,
};

export const reviewQueries = {
  isReviewer: () => queryOptions({ queryKey: reviewKeys.isReviewer(), queryFn: () => reviewApi.isReviewer() }),
  tasks: () => queryOptions({ queryKey: reviewKeys.tasks(), queryFn: () => reviewApi.getReviewTasks() }),
};
