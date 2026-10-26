import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { SiteImageKey } from '@dissco-cs/shared-types';
import { siteImageQueries } from '../../api/queries/site-images';
import { siteImagesApi } from '../../api/cs-client/site-images';
import { HeaderImage } from './PageHeader';

/**
 * The photo chosen in page management for a split-banner's right half, or the fallback when the
 * page has none. Nothing while the list loads, so the fallback does not flash before the photo.
 */
export function PageHeaderPhoto({ pageKey, fallback }: { pageKey: SiteImageKey; fallback?: React.ReactNode }) {
  const { data, isPending } = useQuery(siteImageQueries.list());
  if (isPending) {
    return null;
  }

  const image = data?.find(candidate => candidate.key === pageKey);
  if (!image) {
    return <>{fallback}</>;
  }

  return <HeaderImage src={siteImagesApi.fileUrl(pageKey, image.updatedAt)} credit={image.credit ?? undefined} />;
}
