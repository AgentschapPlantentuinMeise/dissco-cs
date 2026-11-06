import { describe, expect, it } from 'vitest';

import { getPasswordRequirements, isNewPasswordValid } from '../../../src/components/auth/password-requirements';

describe('getPasswordRequirements', () => {
  it('names the rules that are not met yet', () => {
    const unmet = getPasswordRequirements('abc').filter(req => !req.met).map(req => req.key);
    expect(unmet).toEqual(['set_password_req_length', 'set_password_req_uppercase', 'set_password_req_number', 'set_password_req_special']);
  });
});

describe('isNewPasswordValid', () => {
  it('accepts a strong password typed twice', () => {
    expect(isNewPasswordValid('Abcdef1!', 'Abcdef1!')).toBe(true);
  });

  it('refuses two different passwords', () => {
    expect(isNewPasswordValid('Abcdef1!', 'Abcdef1?')).toBe(false);
  });

  it('refuses a weak password, also when typed twice', () => {
    expect(isNewPasswordValid('abcdefgh', 'abcdefgh')).toBe(false);
  });
});
