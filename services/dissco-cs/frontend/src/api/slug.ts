export function getSiteSlug(): string {
  const match = window.location.pathname.match(/\/s\/([^/]+)/);
  if (!match) {
    throw new Error('Could not determine site slug from URL');
  }
  return match[1];
}
