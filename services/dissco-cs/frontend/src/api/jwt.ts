import cookies from 'browser-cookies';
import { getSiteSlug } from './slug';
import { currentLocation, withQuery } from './url';

export function getJwt(): string | undefined {
  return cookies.get(`madoc/${getSiteSlug()}`) || undefined;
}

// Client-side equivalent of Madoc's /logout route: erases the (non-httpOnly) JWT cookie
// so getJwt()/getCurrentUser() see the user as logged out again. Used when a user cancels
// out of the post-login terms gate instead of accepting the new terms.
//
// Deliberately not using cookies.erase() here: browser-cookies encodeURIComponent's the
// cookie *name* when writing (via its internal set()), turning our "madoc/{slug}" name into
// "madoc%2F{slug}" -- a different cookie than the one the server actually set. Its get() does
// NOT encode the name, so reads still work; only erase()/set() are affected. Setting the
// expiry directly avoids that asymmetry.
export function clearJwt(): void {
  const slug = getSiteSlug();
  document.cookie = `madoc/${slug}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/s/${slug}`;
}

// Sends the user back to login when a gated API call 401s (typically an expired session
// cookie). Returns a promise that never resolves, so the caller's fetch chain just stalls
// until the browser finishes navigating away, instead of every page having to special-case
// a 401 to avoid flashing a raw "request failed: 401" error first.
export function redirectToExpiredLogin<T>(): Promise<T> {
  const slug = getSiteSlug();

  // Already on the login page: stay. A call made from the login page itself can still answer 401
  // (e.g. the server ended the session before the token expired); without this guard, each such
  // call would wrap the login URL in a new `redirect` parameter, nesting deeper every time.
  if (window.location.pathname === `/s/${slug}/login`) {
    return new Promise<T>(() => {});
  }

  window.location.href = withQuery(`/s/${slug}/login`, { redirect: currentLocation(), expired: 1 });
  return new Promise<T>(() => {});
}

export type CurrentUser = {
  id: number;
  name: string;
  siteId: number;
  scope: string[];
};

function toBase64(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  return padding === 0 ? normalized : normalized + '='.repeat(4 - padding);
}

export function getCurrentUser(): CurrentUser | undefined {
  const token = getJwt();
  if (!token) {
    return undefined;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return undefined;
  }

  try {
    const payload = JSON.parse(atob(toBase64(parts[1])));
    const userMatch = typeof payload.sub === 'string' ? payload.sub.match(/^urn:madoc:user:(\d+)$/) : null;
    const siteMatch = typeof payload.iss === 'string' ? payload.iss.match(/^urn:madoc:site:(\d+)$/) : null;

    if (!userMatch || !siteMatch || typeof payload.name !== 'string') {
      return undefined;
    }

    // exp is in seconds since 1970. Without this check, an expired cookie still looks "logged in",
    // so pages fire calls that need a login (the navbar's unread counts, ProjectDetail's own tasks)
    // that answer 401 and send the user to login on plain navigation.
    if (typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000) {
      return undefined;
    }

    return {
      id: Number(userMatch[1]),
      name: payload.name,
      siteId: Number(siteMatch[1]),
      scope: typeof payload.scope === 'string' ? payload.scope.split(' ').filter(Boolean) : [],
    };
  } catch {
    return undefined;
  }
}
