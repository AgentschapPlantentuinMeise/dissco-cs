import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { fieldErrorKey, formIssueKey } from '../../src/utility/form-errors';

const issuesOf = (schema: z.ZodType, value: unknown) => {
  const result = schema.safeParse(value, { error: formIssueKey });
  return result.success ? [] : result.error.issues.map(issue => issue.message);
};

describe('formIssueKey', () => {
  it('names an empty required field', () => {
    expect(issuesOf(z.string().trim().min(1), '  ')).toEqual(['form_error_required']);
    expect(issuesOf(z.object({ name: z.string() }), {})).toEqual(['form_error_required']);
  });

  it('names an invalid email address apart from other formats', () => {
    expect(issuesOf(z.email(), 'abc')).toEqual(['form_error_email']);
    expect(issuesOf(z.string().regex(/^\d+$/), 'abc')).toEqual(['form_error_invalid']);
  });

  it('names a value that is too long', () => {
    expect(issuesOf(z.string().max(2), 'abc')).toEqual(['form_error_too_long']);
  });
});

describe('fieldErrorKey', () => {
  it('has nothing to show without an error', () => {
    expect(fieldErrorKey(undefined)).toBeUndefined();
  });

  it('keeps a key the schema chose itself', () => {
    expect(fieldErrorKey({ type: 'custom', message: 'set_password_error_mismatch' })).toBe('set_password_error_mismatch');
  });

  it('replaces an English developer message by the key for its kind of check', () => {
    expect(fieldErrorKey({ type: 'too_small', message: 'Body is required' })).toBe('form_error_required');
    expect(fieldErrorKey({ type: 'too_big', message: 'Too big: expected string to have <=5 characters' })).toBe('form_error_too_long');
    expect(fieldErrorKey({ type: 'custom', message: 'Phone number is too short' })).toBe('form_error_invalid');
  });
});
