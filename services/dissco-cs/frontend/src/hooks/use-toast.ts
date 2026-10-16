import { useSyncExternalStore } from 'react';
import { closeToast, currentToast, subscribeToToast } from '../api/error-toast';

export function useToast() {
  const toast = useSyncExternalStore(subscribeToToast, currentToast);
  return { toast, close: closeToast };
}
