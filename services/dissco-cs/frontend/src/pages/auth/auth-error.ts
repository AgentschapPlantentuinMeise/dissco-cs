import { ApiError } from '../../api/cs-client/request';

// Madoc answers a refused login, registration or password change with an English text (the
// RequestError, NotAuthorized and ConflictError messages in madoc-ts's routes/dissco-cs-auth.ts).
// Each one gets its own translation here. If a text there changes, it is no longer found and the
// user gets the form's general message instead -- less precise, but never English. Keep this list
// in step with that file.
const MADOC_MESSAGE_KEYS: Record<string, string> = {
  'Incorrect email or password': 'auth_error_wrong_login',
  'Incorrect password': 'auth_error_wrong_password',
  'Email already registered': 'auth_error_email_registered',
  'Invalid registration details': 'auth_error_invalid_registration',
  'You must accept the terms and conditions to register': 'auth_error_terms_required',
  'Registration is not enabled for this site': 'auth_error_registration_closed',
  'This invitation link is invalid or expired': 'auth_error_invitation_invalid',
  'This link is invalid or has expired': 'auth_error_link_invalid',
  'Password must be at least 8 characters long and contain an uppercase letter, a lowercase letter, a number and a special character':
    'auth_error_password_weak',
};

// The gateway's rate limit on the auth routes answers 429 with an HTML page, not Madoc's JSON.
export function isTooManyAttempts(err: unknown): boolean {
  return err instanceof ApiError && err.status === 429;
}

// The translation key a login, registration or password form shows when it fails: Madoc's own
// refusal when we know it, "too many attempts" for the gateway's rate limit, and otherwise the
// form's general message -- never the server's text itself.
export function authErrorKey(err: unknown, fallbackKey: string): string {
  if (!(err instanceof ApiError)) {
    return fallbackKey;
  }
  if (isTooManyAttempts(err)) {
    return 'auth_error_too_many_attempts';
  }
  if (err.status < 500 && err.serverMessage) {
    return MADOC_MESSAGE_KEYS[err.serverMessage] ?? fallbackKey;
  }
  return fallbackKey;
}
