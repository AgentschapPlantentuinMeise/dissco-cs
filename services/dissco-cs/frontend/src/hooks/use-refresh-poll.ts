import { useEffect, useState } from 'react';

const POLL_MS = 3 * 1000;
// A safety net: a recalculation that never finishes would otherwise be polled for as long as the
// page stays open.
const MAX_POLL_MS = 2 * 60 * 1000;

/**
 * Query options for a cache-only /current stats query: it runs only when the normal call said the
 * backend is recalculating (`refreshing: true`), then every 3 s until its own answer says the
 * recalculation is done, and never longer than 2 minutes after the page opened.
 * @param refreshing `refreshing` from the normal call's answer; undefined while that is loading
 * Returns: `enabled` and `refetchInterval` to spread into the /current query.
 */
export function useRefreshPoll(refreshing: boolean | undefined) {
  const [inWindow, setInWindow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setInWindow(false), MAX_POLL_MS);
    return () => clearTimeout(timer);
  }, []);

  return {
    enabled: refreshing === true && inWindow,
    refetchInterval: (query: { state: { data?: { refreshing: boolean } } }) =>
      query.state.data?.refreshing === false ? false : POLL_MS,
  };
}
