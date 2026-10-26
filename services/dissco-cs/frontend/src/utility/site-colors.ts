import { SITE_COLOR_KEYS, SiteColors } from '@dissco-cs/shared-types';
import { readSiteCache, writeSiteCache } from './site-cache';

// Sets the site's palette on <html>, overriding the defaults from citizen-science-theme.css; every
// Tailwind token cs-* reads these variables. null removes the overrides, so the defaults return.
export function applySiteColors(colors: SiteColors | null): void {
  const style = document.documentElement.style;
  for (const key of SITE_COLOR_KEYS) {
    if (colors) {
      style.setProperty(`--cs-${key}`, colors[key]);
    } else {
      style.removeProperty(`--cs-${key}`);
    }
  }
}

// The last palette is remembered per site, so a page load can apply it before the theme request
// returns -- otherwise a site with its own palette would flash the default colors on every load.
const CACHE_NAME = 'site-colors';

export function cacheSiteColors(colors: SiteColors | null): void {
  writeSiteCache(CACHE_NAME, colors);
}

export function readCachedSiteColors(): SiteColors | null {
  return readSiteCache<SiteColors>(CACHE_NAME) ?? null;
}
