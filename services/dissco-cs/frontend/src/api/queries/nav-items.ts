import { queryOptions } from '@tanstack/react-query';
import { navItemsApi } from '../cs-client/nav-items';

export const navItemKeys = {
  all: ['nav-items'] as const,
  contactEmail: () => [...navItemKeys.all, 'contact-email'] as const,
};

export const navItemQueries = {
  list: () => queryOptions({ queryKey: navItemKeys.all, queryFn: () => navItemsApi.list() }),
  contactEmail: () => queryOptions({ queryKey: navItemKeys.contactEmail(), queryFn: () => navItemsApi.getContactEmail() }),
};
