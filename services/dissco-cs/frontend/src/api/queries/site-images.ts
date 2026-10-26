import { queryOptions } from '@tanstack/react-query';
import { SiteImageDto } from '@dissco-cs/shared-types';
import { siteImagesApi } from '../cs-client/site-images';
import { readSiteCache, writeSiteCache } from '../../utility/site-cache';

export const siteImageKeys = {
  all: ['site-images'] as const,
};

const CACHE_NAME = 'site-images';

export const siteImageQueries = {
  // Starts from the last list seen on this site, so the logo and header photo show at once
  // (the images themselves come from the browser cache). initialDataUpdatedAt 0 marks that list
  // as stale, so it is still checked against the server right away.
  list: () =>
    queryOptions({
      queryKey: siteImageKeys.all,
      queryFn: async () => {
        const images = await siteImagesApi.list();
        writeSiteCache(CACHE_NAME, images);
        return images;
      },
      initialData: () => readSiteCache<SiteImageDto[]>(CACHE_NAME),
      initialDataUpdatedAt: 0,
    }),
};
