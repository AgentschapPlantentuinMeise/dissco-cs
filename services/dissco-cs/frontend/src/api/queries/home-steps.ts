import { queryOptions } from '@tanstack/react-query';
import { homeStepsApi } from '../cs-client/home-steps';

export const homeStepKeys = {
  all: ['home-steps'] as const,
};

export const homeStepQueries = {
  list: () => queryOptions({ queryKey: homeStepKeys.all, queryFn: () => homeStepsApi.list() }),
};
