import { queryOptions } from '@tanstack/react-query';
import { navItemsApi } from '../cs-client/nav-items';

export const navItemKeys = {
  all: ['nav-items'] as const,
};

export const navItemQueries = {
  list: () => queryOptions({ queryKey: navItemKeys.all, queryFn: () => navItemsApi.list() }),
};
