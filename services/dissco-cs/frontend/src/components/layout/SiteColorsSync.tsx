import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { siteThemeQueries } from '../../api/queries/site-theme';
import { applySiteColors, cacheSiteColors } from '../../utility/site-colors';

// Keeps the page's colors in line with the site's palette: on load, and right after an admin saves
// or resets it (the mutation invalidates this query).
export function SiteColorsSync() {
  const { data, isSuccess } = useQuery(siteThemeQueries.get());

  useEffect(() => {
    if (!isSuccess) {
      return;
    }
    applySiteColors(data);
    cacheSiteColors(data);
  }, [data, isSuccess]);

  return null;
}
