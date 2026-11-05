import { reportClientError } from './cs-client/client-errors';
import { userProfileApi } from './cs-client/user-profile';
import { getCurrentUser } from './jwt';

// Runs once per page load. That covers logging in as well: the login page ends with a full reload.
export function recordVisit(): void {
  if (!getCurrentUser()) return;
  userProfileApi.visit().catch(err => reportClientError(err, 'action'));
}
