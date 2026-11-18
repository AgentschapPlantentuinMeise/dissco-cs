import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { withNewPasswordRules } from '../../../src/components/auth/password-requirements';

const schema = withNewPasswordRules(z.object({ password: z.string(), confirmPassword: z.string() }));
const errors = (password: string, confirmPassword: string) => {
  const result = schema.safeParse({ password, confirmPassword });
  return result.success ? [] : result.error.issues.map(issue => [issue.path.join('.'), issue.message]);
};

describe('withNewPasswordRules', () => {
  it('accepts a strong password typed twice', () => {
    expect(errors('Abcdef1!', 'Abcdef1!')).toEqual([]);
  });

  it('puts a weak password on the password field', () => {
    expect(errors('abcdefgh', 'abcdefgh')).toEqual([['password', 'auth_error_password_weak']]);
  });

  it('puts a different second password on the confirm field', () => {
    expect(errors('Abcdef1!', 'Abcdef1?')).toEqual([['confirmPassword', 'set_password_error_mismatch']]);
  });
});
