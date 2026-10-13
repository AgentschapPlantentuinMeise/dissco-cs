import { describe, expect, it } from 'vitest';

import { isSafeSegment, madocPath } from '../../src/madoc-client/path-segment.js';

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

describe('madocPath', () => {
  it('builds the path from safe strings and numbers', () => {
    const taskId = 'abc-1';
    const siteId = 7;
    expect(madocPath`/api/tasks/${taskId}/stats`).toBe('/api/tasks/abc-1/stats');
    expect(madocPath`/api/madoc/iiif/collections/${siteId}`).toBe('/api/madoc/iiif/collections/7');
  });

  it('returns a path without interpolations unchanged', () => {
    expect(madocPath`/api/tasks`).toBe('/api/tasks');
  });

  it.each(['..', '../x', 'a/b', 'a%2Fb', ''])('throws for %j', value => {
    expect(() => madocPath`/api/tasks/${value}`).toThrow('Unsafe path segment for Madoc path');
  });
});
