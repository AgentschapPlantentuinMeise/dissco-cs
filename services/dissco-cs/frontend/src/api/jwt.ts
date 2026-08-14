import cookies from 'browser-cookies';
import { getSiteSlug } from './slug';

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

  // getCurrentUser() doesn't check the JWT's exp claim, so a server-side-expired cookie
  // still looks "logged in" client-side. That means gated calls made from the login page
  // itself (e.g. Navbar's unread-count fetch) can also 401. Without this guard, each one
  // would re-encode the already-redirected-to URL into a new `redirect` param, nesting
  // deeper forever instead of just staying put.
  if (window.location.pathname === `/s/${slug}/login`) {
    return new Promise<T>(() => {});
  }

  const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  window.location.href = `/s/${slug}/login?redirect=${redirect}&expired=1`;
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
