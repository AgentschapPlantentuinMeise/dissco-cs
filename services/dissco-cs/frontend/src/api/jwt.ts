import cookies from 'browser-cookies';
import { getSiteSlug } from './slug';

export function getJwt(): string | undefined {
  return cookies.get(`madoc/${getSiteSlug()}`) || undefined;
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
