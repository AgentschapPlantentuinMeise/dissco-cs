import { describe, expect, it } from 'vitest';

import { describeError } from '../../src/infrastructure/describe-error.js';

describe('describeError', () => {
  it('takes message and stack from an Error', () => {
    const result = describeError(new Error('boom'));
    expect(result.message).toBe('boom');
    expect(result.stack).toContain('boom');
  });

  it('falls back to the error name when the message is empty', () => {
    expect(describeError(new TypeError('')).message).toBe('TypeError');
  });

  it('caps message and stack length', () => {
    const err = new Error('x'.repeat(5000));
    err.stack = 'y'.repeat(10000);
    const result = describeError(err);
    expect(result.message).toHaveLength(1000);
    expect(result.stack).toHaveLength(4000);
  });

  it.each([
    ['a string', 'plain text', 'plain text'],
    ['an object', { code: 42 }, '{"code":42}'],
    ['undefined', undefined, 'undefined'],
  ])('describes %s without a stack', (_label, thrown, message) => {
    expect(describeError(thrown)).toEqual({ message });
  });
});
