import { describe, expect, it } from 'vitest';

import { assertSafeSegment, isSafeSegment } from '../../src/madoc-client/path-segment.js';

describe('isSafeSegment', () => {
  it.each(['12', 'my-project_1', '3f2b8c1e-9a4d-4e1f-8b7a-2c5d6e7f8a9b'])('accepts %s', value => {
    expect(isSafeSegment(value)).toBe(true);
  });

  it.each(['..', 'a/b', '../../api/site', 'a%2Fb', '', 'a b', 'a?x=1', 'a#b'])('rejects %j', value => {
    expect(isSafeSegment(value)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isSafeSegment(undefined)).toBe(false);
  });
});

describe('assertSafeSegment', () => {
  it('throws for an unsafe value', () => {
    expect(() => assertSafeSegment('..', 'task id')).toThrow('Unsafe task id for Madoc path');
  });

  it('does not throw for a safe value', () => {
    expect(() => assertSafeSegment('12', 'task id')).not.toThrow();
  });
});
