import { getSiteSlug } from '../api/slug';

// The last known value of something that shapes every page (palette, logo, header photos),
// remembered per site in localStorage. A page load can then use it straight away instead of
// waiting for the request -- which otherwise shows the default first and swaps it a moment later.
const cacheKey = (name: string) => `dissco-cs:${name}:${getSiteSlug()}`;

export function writeSiteCache(name: string, value: unknown): void {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(cacheKey(name));
    } else {
      localStorage.setItem(cacheKey(name), JSON.stringify(value));
    }
  } catch {
    // Storage blocked (private mode, policy): the value then simply arrives with the request.
  }
}

export function readSiteCache<T>(name: string): T | undefined {
  try {
    const stored = localStorage.getItem(cacheKey(name));
    return stored ? (JSON.parse(stored) as T) : undefined;
  } catch {
    return undefined;
  }
}
