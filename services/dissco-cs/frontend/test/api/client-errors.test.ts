import { describe, expect, it } from 'vitest';

import { shouldReport } from '../../src/api/cs-client/client-errors';
import { ApiError } from '../../src/api/cs-client/request';

describe('shouldReport', () => {
  it('skips errors from our own API -- the backend already knows', () => {
    expect(shouldReport(new ApiError(500, '/projects'))).toBe(false);
    expect(shouldReport(new ApiError(404, '/projects/1'))).toBe(false);
  });

  it.each([
    ['a network failure', new TypeError('Failed to fetch')],
    ['a bug', new Error('Cannot read properties of undefined')],
    ['a thrown string', 'boom'],
  ])('reports %s', (_label, err) => {
    expect(shouldReport(err)).toBe(true);
  });
});
