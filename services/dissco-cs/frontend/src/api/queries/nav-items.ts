import { queryOptions } from '@tanstack/react-query';
import { navItemsApi } from '../cs-client/nav-items';
import { STATIC } from './freshness';

export const navItemKeys = {
  all: ['nav-items'] as const,
  contactEmail: () => [...navItemKeys.all, 'contact-email'] as const,
};

export const navItemQueries = {
  list: () => queryOptions({ queryKey: navItemKeys.all, queryFn: () => navItemsApi.list(), ...STATIC }),
  contactEmail: () => queryOptions({ queryKey: navItemKeys.contactEmail(), queryFn: () => navItemsApi.getContactEmail(), ...STATIC }),
};
