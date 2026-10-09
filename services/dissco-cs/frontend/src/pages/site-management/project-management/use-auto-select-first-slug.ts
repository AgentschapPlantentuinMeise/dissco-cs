import { useEffect } from 'react';

// Defaults a project picker to the first project in the list once it has loaded.
export function useAutoSelectFirstSlug(
  projects: { slug: string }[],
  selectedSlug: string | null,
  setSelectedSlug: (slug: string) => void
) {
  useEffect(() => {
    if (!selectedSlug && projects[0]) {
      setSelectedSlug(projects[0].slug);
    }
  }, [projects, selectedSlug, setSelectedSlug]);
}
