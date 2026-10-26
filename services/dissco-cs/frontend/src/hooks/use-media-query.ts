import { useSyncExternalStore } from 'react';

// Whether a CSS media query matches now, e.g. '(min-width: 1024px)'; updates when the window is
// resized across it.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    onChange => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches
  );
}
