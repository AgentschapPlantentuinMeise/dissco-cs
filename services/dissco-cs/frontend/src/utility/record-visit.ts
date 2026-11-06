import i18n from '../i18n';
import { changeLanguage } from './change-language';
import { reportClientError } from '../api/cs-client/client-errors';
import { userProfileApi } from '../api/cs-client/user-profile';
import { getCurrentUser } from '../api/jwt';

// Runs once per page load. That covers logging in as well: the login page ends with a full reload.
// A preferred language wins over a choice in the navbar, which only lasts until this page load. It
// is written to the cookie too, so the next page starts in the right language straight away.
export function recordVisit(): void {
  if (!getCurrentUser()) return;
  userProfileApi
    .visit()
    .then(({ preferredLanguage }) => {
      if (preferredLanguage) changeLanguage(i18n, preferredLanguage);
    })
    .catch(err => reportClientError(err, 'action'));
}
