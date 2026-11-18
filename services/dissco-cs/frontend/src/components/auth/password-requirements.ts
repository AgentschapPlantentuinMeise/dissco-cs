import { z } from 'zod';

/**
 * The rules for a new password, each with its translation key and whether it is met. Mirrors
 * validatePasswordStrength() in madoc-ts's routes/dissco-cs-auth.ts: this is feedback while typing,
 * the server call is the real check.
 * @param password the password typed so far
 * Returns: one entry per rule.
 */
export function getPasswordRequirements(password: string) {
  return [
    { key: 'set_password_req_length', met: password.length >= 8 },
    { key: 'set_password_req_uppercase', met: /[A-Z]/.test(password) },
    { key: 'set_password_req_lowercase', met: /[a-z]/.test(password) },
    { key: 'set_password_req_number', met: /[0-9]/.test(password) },
    { key: 'set_password_req_special', met: /[^a-zA-Z0-9]/.test(password) },
  ];
}

/**
 * Adds the rules for a new password to a form schema, as field errors: a weak password on
 * "password", a different second one on "confirmPassword".
 * @param schema an object schema with at least password and confirmPassword
 * Returns: the same schema with both checks added.
 */
export function withNewPasswordRules<S extends z.ZodType<{ password: string; confirmPassword: string }>>(schema: S): S {
  return schema
    .refine(value => getPasswordRequirements(value.password).every(req => req.met), {
      message: 'auth_error_password_weak',
      path: ['password'],
    })
    .refine(value => value.password === value.confirmPassword, {
      message: 'set_password_error_mismatch',
      path: ['confirmPassword'],
    });
}

/**
 * Whether a new password can be submitted.
 * @param password the new password
 * @param confirmPassword the same password, typed again
 * Returns: true when it meets every rule and both are the same.
 */
export function isNewPasswordValid(password: string, confirmPassword: string): boolean {
  return password === confirmPassword && getPasswordRequirements(password).every(req => req.met);
}
