import { describe, expect, it } from 'vitest';

import { mutationErrorMessage } from '../../src/api/query-client';

describe('mutationErrorMessage', () => {
  it('falls back to the generic save message', () => {
    expect(mutationErrorMessage(undefined)).toBe('error_save_failed');
    expect(mutationErrorMessage({})).toBe('error_save_failed');
  });

  it('uses the message the mutation asks for', () => {
    expect(mutationErrorMessage({ errorMessage: 'error_delete_failed' })).toBe('error_delete_failed');
  });

  it('stays quiet when the page shows its own message', () => {
    expect(mutationErrorMessage({ handlesOwnError: true, errorMessage: 'error_delete_failed' })).toBeNull();
  });
});
