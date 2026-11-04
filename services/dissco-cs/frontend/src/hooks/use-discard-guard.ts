import { useState } from 'react';

// Asks before an action throws away unsaved input; without unsaved input the action runs straight
// away. The question itself is <DiscardDialog guard={...} />, rendered next to the form.
export function useDiscardGuard(isDirty: boolean) {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  return {
    isAsking: pendingAction !== null,
    guard: (action: () => void) => {
      if (isDirty) {
        setPendingAction(() => action);
      } else {
        action();
      }
    },
    confirm: () => {
      pendingAction?.();
      setPendingAction(null);
    },
    cancel: () => setPendingAction(null),
  };
}

export type DiscardGuard = ReturnType<typeof useDiscardGuard>;
