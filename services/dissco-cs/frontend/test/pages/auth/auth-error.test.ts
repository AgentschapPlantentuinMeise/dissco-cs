import { describe, expect, it } from 'vitest';

import { authErrorKey } from '../../../src/pages/auth/auth-error';
import { ApiError } from '../../../src/api/cs-client/request';

const FALLBACK = 'login_form_error';

describe('authErrorKey', () => {
  it.each([
    ['Incorrect email or password', 401, 'auth_error_wrong_login'],
    ['Email already registered', 409, 'auth_error_email_registered'],
    ['This link is invalid or has expired', 400, 'auth_error_link_invalid'],
  ])("translates Madoc's refusal %s", (message, status, key) => {
    expect(authErrorKey(new ApiError(status, '/auth', message, false), FALLBACK)).toBe(key);
  });

  it("tells the user to wait on the gateway's rate limit, not its HTML page", () => {
    expect(authErrorKey(new ApiError(429, '/auth/login', '<html>429 Too Many Requests</html>', false), FALLBACK)).toBe(
      'auth_error_too_many_attempts'
    );
  });

  it.each([
    ['a Madoc text we do not know (e.g. after a change in Madoc)', new ApiError(400, '/auth/login', 'Wrong email or password', false)],
    ['a gateway error', new ApiError(502, '/auth/login', '<html>Bad Gateway</html>', false)],
    ['a server error', new ApiError(500, '/auth/login', 'Internal Server Error', false)],
    ['a 4xx without a message from the server', new ApiError(400, '/auth/login', undefined, false)],
    ['a network failure', new TypeError('Failed to fetch')],
    ['a plain Error', new Error('something technical')],
  ])("falls back to the form's own message for %s, never English or technical", (_label, err) => {
    expect(authErrorKey(err, FALLBACK)).toBe(FALLBACK);
  });
});
