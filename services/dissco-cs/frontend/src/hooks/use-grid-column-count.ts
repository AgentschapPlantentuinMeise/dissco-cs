import { useEffect, useState } from 'react';

// Reads the browser's own resolved grid-template-columns instead of re-deriving breakpoints in
// JS, so this stays correct automatically if the CSS (auto-fill/minmax, container width) changes.
// Returns a callback ref (not a ref object), so it also measures a grid that only appears after
// the first render, e.g. once its data has loaded.
export function useGridColumnCount<T extends HTMLElement>(defaultColumns = 3): [(element: T | null) => void, number] {
  const [element, setElement] = useState<T | null>(null);
  const [columns, setColumns] = useState(defaultColumns);

  useEffect(() => {
    if (!element) return;

    const measure = () => {
      const trackCount = getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length;
      if (trackCount > 0) setColumns(trackCount);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [setElement, columns];
}
