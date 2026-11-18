import type { FieldError } from 'react-hook-form';
import type { $ZodRawIssue } from 'zod/v4/core';

export type FormErrorKey = 'form_error_required' | 'form_error_email' | 'form_error_too_long' | 'form_error_invalid';

/**
 * zod's error map for a form: turns a failed check into the translation key shown under the field,
 * so the message is in the site's language instead of zod's English.
 * @param issue the issue zod raises (its code, and for a format check which format)
 * Returns: the translation key.
 */
export function formIssueKey(issue: Pick<$ZodRawIssue, 'code'> & { format?: string }): FormErrorKey {
  switch (issue.code) {
    case 'too_small':
    case 'invalid_type':
      return 'form_error_required';
    case 'too_big':
      return 'form_error_too_long';
    case 'invalid_format':
      return issue.format === 'email' ? 'form_error_email' : 'form_error_invalid';
    default:
      return 'form_error_invalid';
  }
}

// A translation key, not a sentence.
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * The translation key to show for a field's error.
 * @param error the field's error from react-hook-form (formState.errors.x)
 * Returns: the key, or undefined when the field has no error. A schema can name its own key (a
 * refine with message 'set_password_error_mismatch'); a schema-level message always wins over the
 * error map in zod, and some shared schemas carry English texts for developers ('Body is required'),
 * so a message that is not a key falls back to the key for its kind of check.
 */
export function fieldErrorKey(error: Pick<FieldError, 'type' | 'message'> | undefined): string | undefined {
  if (!error) return undefined;
  if (error.message && KEY_PATTERN.test(error.message)) return error.message;
  return formIssueKey({ code: String(error.type) as $ZodRawIssue['code'] });
}
