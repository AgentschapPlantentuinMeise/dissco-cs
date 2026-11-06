import { queryOptions } from '@tanstack/react-query';
import { userProfileApi } from '../cs-client/user-profile';

export const userProfileKeys = {
  all: ['user-profile'] as const,
};

export const userProfileQueries = {
  get: () => queryOptions({ queryKey: userProfileKeys.all, queryFn: () => userProfileApi.get() }),
};
