import { useEffect, useRef, useState } from 'react';

// Reads the browser's own resolved grid-template-columns instead of re-deriving breakpoints in
// JS, so this stays correct automatically if the CSS (auto-fill/minmax, container width) changes.
export function useGridColumnCount<T extends HTMLElement>(defaultColumns = 3): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [columns, setColumns] = useState(defaultColumns);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const trackCount = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length;
      if (trackCount > 0) setColumns(trackCount);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, columns];
}
