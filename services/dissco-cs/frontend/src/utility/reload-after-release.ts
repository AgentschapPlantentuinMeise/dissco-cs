const RELOADED_AT_KEY = 'cs-reloaded-after-release-at';
const MIN_INTERVAL_MS = 10 * 1000;

/**
 * Reloads the page once when a lazily loaded page's file is missing. After a release, a tab that was
 * already open still holds the old index.html, which names files the new release no longer has;
 * opening such a page fails. A reload fetches the new index.html (Vite's documented fix,
 * the 'vite:preloadError' event). At most once per 10 s: when a reload does not help, the error goes
 * on to the page's error boundary instead of reloading forever.
 * Input: none.
 * Returns: nothing.
 */
export function reloadAfterRelease(): void {
  window.addEventListener('vite:preloadError', event => {
    const last = Number(sessionStorage.getItem(RELOADED_AT_KEY) ?? 0);
    if (Date.now() - last < MIN_INTERVAL_MS) {
      return;
    }
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()));
    event.preventDefault();
    window.location.reload();
  });
}
