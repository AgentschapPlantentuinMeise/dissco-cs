import { queryOptions } from '@tanstack/react-query';
import { siteSettingsApi } from '../cs-client/site-settings';

export const siteSettingsKeys = {
  all: ['site-settings'] as const,
  honourBoard: () => [...siteSettingsKeys.all, 'honour-board'] as const,
};

export const siteSettingsQueries = {
  honourBoard: () => queryOptions({ queryKey: siteSettingsKeys.honourBoard(), queryFn: () => siteSettingsApi.getHonourBoard() }),
};
