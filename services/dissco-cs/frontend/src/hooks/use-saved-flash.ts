import { useEffect, useState } from 'react';

const FLASH_MS = 3000;

// The item of a management list that was just saved, for a few seconds: its form has closed, so
// the list marks the row to show where the change landed.
export function useSavedFlash<Id>() {
  const [savedId, setSavedId] = useState<Id | null>(null);

  useEffect(() => {
    if (savedId === null) return;
    const timer = setTimeout(() => setSavedId(null), FLASH_MS);
    return () => clearTimeout(timer);
  }, [savedId]);

  return { savedId, flash: setSavedId };
}
