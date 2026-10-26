import { useQuery } from '@tanstack/react-query';
import { siteThemeQueries } from '../api/queries/site-theme';
import { disscoCSConfig } from '../dissco-cs-config';

// The site's name: the one set in site management, else the platform's name from the config.
// Pass it to every translation with {{platformName}}: t('nav_about', { platformName }).
export function useSiteName(): string {
  const { data } = useQuery(siteThemeQueries.get());
  return data?.name || disscoCSConfig.platformName;
}
