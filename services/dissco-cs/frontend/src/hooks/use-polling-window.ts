import { useEffect, useState } from 'react';

// Polls at `intervalMs` for `activeMs` after mount, then stops entirely -- a page left open long
// after landing doesn't need to keep hitting the server every few seconds forever.
export function usePollingWindow(activeMs = 2 * 60 * 1000, intervalMs = 15 * 1000): number | false {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setActive(false), activeMs);
    return () => clearTimeout(timer);
  }, [activeMs]);

  return active ? intervalMs : false;
}
