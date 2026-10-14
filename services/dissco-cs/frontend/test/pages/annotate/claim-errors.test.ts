import { describe, expect, it } from 'vitest';

import { ApiError } from '../../../src/api/cs-client/request';
import { isContributorLimitReached } from '../../../src/pages/annotate/claim-errors';

describe('isContributorLimitReached', () => {
  it("recognises Madoc's full-task answer", () => {
    expect(isContributorLimitReached(new ApiError(400, '/projects/1/prepare-claim', 'Maximum number of contributors reached'))).toBe(true);
  });

  it.each([
    ['another 400', new ApiError(400, '/x', 'Invalid input')],
    ['same text, other status', new ApiError(500, '/x', 'Maximum number of contributors reached')],
    ['a 404', new ApiError(404, '/x')],
    ['a plain Error', new Error('Maximum number of contributors reached')],
  ])('does not match %s', (_label, err) => {
    expect(isContributorLimitReached(err)).toBe(false);
  });
});
