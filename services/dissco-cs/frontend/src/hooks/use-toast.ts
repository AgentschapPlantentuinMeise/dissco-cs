import { useSyncExternalStore } from 'react';
import { reportClientError } from '../api/cs-client/client-errors';

// The fixed set of user-facing error messages (translation keys) -- a toast never shows the
// server's technical message, only one of these, in the site's language.
export type ErrorMessageKey =
  | 'error_save_failed'
  | 'error_delete_failed'
  | 'error_claim_failed'
  | 'error_release_failed'
  | 'error_upload_failed'
  | 'error_send_failed'
  | 'error_load_failed'
  | 'error_generic';

type ToastState = { id: number; key: ErrorMessageKey } | null;

let current: ToastState = null;
let nextId = 1;
const listeners = new Set<() => void>();

function setCurrent(next: ToastState) {
  current = next;
  listeners.forEach(listener => listener());
}

// Callable from anywhere, also outside React (e.g. the QueryClient). One message at a time: a new
// one replaces the previous. It stays until the user closes it.
export function showError(key: ErrorMessageKey): void {
  setCurrent({ id: nextId++, key });
}

// For a user action that failed in a page's own handler: report it (see client-errors.ts) and tell
// the user. Mutations through useMutation get this from the QueryClient already.
export function reportActionError(err: unknown, key: ErrorMessageKey): void {
  reportClientError(err, 'action');
  showError(key);
}

export function useToast() {
  const toast = useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current
  );
  return { toast, close: () => setCurrent(null) };
}
