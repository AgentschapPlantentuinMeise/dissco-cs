import { SITE_COLOR_KEYS, SiteColors } from '@dissco-cs/shared-types';
import { getSiteSlug } from '../api/slug';

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
const cacheKey = () => `dissco-cs:site-colors:${getSiteSlug()}`;

export function cacheSiteColors(colors: SiteColors | null): void {
  try {
    if (colors) {
      localStorage.setItem(cacheKey(), JSON.stringify(colors));
    } else {
      localStorage.removeItem(cacheKey());
    }
  } catch {
    // Storage blocked (private mode, policy): the palette then simply arrives with the request.
  }
}

export function readCachedSiteColors(): SiteColors | null {
  try {
    const stored = localStorage.getItem(cacheKey());
    return stored ? (JSON.parse(stored) as SiteColors) : null;
  } catch {
    return null;
  }
}
