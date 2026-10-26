import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { siteThemeQueries } from '../../api/queries/site-theme';
import { applySiteColors, cacheSiteColors } from '../../utility/site-colors';
import { useSiteName } from '../../hooks/use-site-name';

// Keeps the page in line with the site's own palette and name: on load, and right after an admin
// saves or resets them (the mutations invalidate this query).
export function SiteThemeSync() {
  const { data, isSuccess } = useQuery(siteThemeQueries.get());
  const siteName = useSiteName();

  useEffect(() => {
    if (!isSuccess) {
      return;
    }
    applySiteColors(data.colors);
    cacheSiteColors(data.colors);
  }, [data, isSuccess]);

  useEffect(() => {
    document.title = siteName;
  }, [siteName]);

  return null;
}
