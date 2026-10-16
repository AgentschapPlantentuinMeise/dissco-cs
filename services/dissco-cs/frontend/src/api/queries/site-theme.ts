import { queryOptions } from '@tanstack/react-query';
import { siteThemeApi } from '../cs-client/site-theme';

export const siteThemeKeys = {
  all: ['site-theme'] as const,
};

export const siteThemeQueries = {
  get: () => queryOptions({ queryKey: siteThemeKeys.all, queryFn: () => siteThemeApi.get() }),
};
