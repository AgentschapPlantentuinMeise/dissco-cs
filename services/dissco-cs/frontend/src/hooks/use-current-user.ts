import { getCurrentUser } from '../api/jwt';

export function useCurrentUser() {
  return getCurrentUser();
}
