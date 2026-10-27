import { describe, expect, it } from 'vitest';

import { ApiError, isNotFound } from '../../../src/api/cs-client/request';

describe('isNotFound', () => {
  it('is true for a 404 from the backend', () => {
    expect(isNotFound(new ApiError(404, '/institutions/x'))).toBe(true);
  });

  it('is false for any other failure, so the page offers a retry', () => {
    expect(isNotFound(new ApiError(500, '/institutions/x'))).toBe(false);
    expect(isNotFound(new ApiError(502, '/institutions/x'))).toBe(false);
    expect(isNotFound(new TypeError('Failed to fetch'))).toBe(false);
    expect(isNotFound(null)).toBe(false);
  });
});
