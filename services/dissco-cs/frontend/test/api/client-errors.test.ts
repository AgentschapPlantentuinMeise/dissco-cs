import { describe, expect, it } from 'vitest';

import { shouldReport } from '../../src/api/cs-client/client-errors';
import { ApiError } from '../../src/api/cs-client/request';

describe('shouldReport', () => {
  it('skips errors from our own API -- the backend already knows', () => {
    expect(shouldReport(new ApiError(500, '/projects'))).toBe(false);
    expect(shouldReport(new ApiError(404, '/projects/1'))).toBe(false);
  });

  it('reports a 5xx the backend never saw: a 502/504 from the gateway, or Madoc', () => {
    expect(shouldReport(new ApiError(502, '/projects', undefined, false))).toBe(true);
    expect(shouldReport(new ApiError(504, '/projects', undefined, false))).toBe(true);
    expect(shouldReport(new ApiError(500, '/s/site/madoc/api/auth/login', undefined, false))).toBe(true);
  });

  it('skips a 4xx that did not come from our backend -- an expected answer, e.g. a wrong password', () => {
    expect(shouldReport(new ApiError(401, '/s/site/madoc/api/auth/login', 'Incorrect email or password', false))).toBe(false);
  });

  it.each([
    ['a network failure', new TypeError('Failed to fetch')],
    ['a bug', new Error('Cannot read properties of undefined')],
    ['a thrown string', 'boom'],
  ])('reports %s', (_label, err) => {
    expect(shouldReport(err)).toBe(true);
  });
});
