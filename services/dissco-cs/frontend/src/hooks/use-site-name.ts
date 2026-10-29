import { useQuery } from '@tanstack/react-query';
import { siteThemeQueries } from '../api/queries/site-theme';

// The site's name: Madoc's own site title, set in Madoc's site admin. Empty while it loads.
// Pass it to every translation with {{platformName}}: t('nav_about', { platformName }).
export function useSiteName(): string {
  const { data } = useQuery(siteThemeQueries.get());
  return data?.name ?? '';
}
