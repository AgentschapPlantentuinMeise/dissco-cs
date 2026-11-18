import { useState } from 'react';

/**
 * Remembers which fields the user has left, so their error shows from then on instead of while
 * the form is still empty. For the management forms whose values live in a draft of their own
 * (useItemEditor, shared by those pages): react-hook-form does the same for forms it owns, but would
 * have to take over that draft.
 * @param scope optional: what the form is editing, for a form that stays mounted while switching
 *   items (page management); a new scope starts with no field left.
 * Returns: left (field -> left yet) and leave(field), an onBlur handler.
 */
export function useLeftFields<K extends string>(scope?: unknown) {
  type Left = Partial<Record<K, boolean>>;
  const none: Left = {};
  const [state, setState] = useState<{ scope: unknown; left: Left }>({ scope, left: none });
  const left = state.scope === scope ? state.left : none;
  const leave = (field: K) => () =>
    setState(prev => {
      const current = prev.scope === scope ? prev.left : none;
      return current[field] ? prev : { scope, left: { ...current, [field]: true } };
    });
  return { left, leave };
}
