import { getSiteSlug } from './slug';

export type QueryValue = string | number | boolean | undefined | null;

/**
 * Builds a URL path from a template, encoding every value (encodeURIComponent) but not the fixed
 * text -- so a slug or id can never add a '/', '?' or '#' to the path.
 * E.g. urlPath`/projects/${slug}/manual`.
 * Returns: the path.
 */
export function urlPath(strings: TemplateStringsArray, ...values: Array<string | number>): string {
  return strings.reduce((path, text, i) => path + text + (i < values.length ? encodeURIComponent(String(values[i])) : ''), '');
}

/**
 * Adds a query string to a path. Values that are undefined or null are left out.
 * @param path the path, without a query string
 * @param params the query parameters, in the order they should appear
 * Returns: 'path?a=1&b=2', or the path unchanged when no parameter is left.
 */
export function withQuery(path: string, params: Record<string, QueryValue>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) query.set(key, String(value));
  }
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

/**
 * withQuery with the current site's slug first (?slug=...), which our backend needs to know the
 * site of an anonymous visitor.
 * @param path the path, without a query string
 * @param params extra query parameters
 * Returns: 'path?slug=...&...'. Throws when the page is not on a site (/s/{slug}/...).
 */
export function withSite(path: string, params: Record<string, QueryValue> = {}): string {
  return withQuery(path, { slug: getSiteSlug(), ...params });
}

/**
 * The current page as a path with its query, for a `redirect` parameter (withQuery encodes it).
 * Input: none.
 * Returns: e.g. '/s/demo/projects/7?tab=tasks'.
 */
export function currentLocation(): string {
  return `${window.location.pathname}${window.location.search}`;
}
