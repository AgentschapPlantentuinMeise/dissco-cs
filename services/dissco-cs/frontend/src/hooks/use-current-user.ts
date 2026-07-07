import { getCurrentUser } from '../api/jwt';

export function useUser() {
  return getCurrentUser();
}
