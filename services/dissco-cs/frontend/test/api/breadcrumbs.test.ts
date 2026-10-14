import { describe, expect, it } from 'vitest';

import { addBreadcrumb, getBreadcrumbs, withoutQuery } from '../../src/api/breadcrumbs';

describe('withoutQuery', () => {
  it.each([
    ['/projects/12?slug=site&page=2', '/projects/12'],
    ['/explore/abc#top', '/explore/abc'],
    ['/plain', '/plain'],
  ])('%s -> %s', (path, expected) => {
    expect(withoutQuery(path)).toBe(expected);
  });
});

describe('breadcrumbs', () => {
  it('keeps only the last 10, oldest first', () => {
    for (let i = 1; i <= 12; i++) {
      addBreadcrumb('api', `call ${i}`, new Date(Date.UTC(2026, 0, 1, 0, 0, i)));
    }
    const trail = getBreadcrumbs();
    expect(trail.map(b => b.text)).toEqual(Array.from({ length: 10 }, (_, i) => `call ${i + 3}`));
    expect(trail[0].at).toBe('2026-01-01T00:00:03.000Z');
  });

  it('caps the text length', () => {
    addBreadcrumb('route', 'x'.repeat(500));
    expect(getBreadcrumbs().at(-1)?.text).toHaveLength(200);
  });

  it('returns a copy, not the live trail', () => {
    getBreadcrumbs().length = 0;
    expect(getBreadcrumbs().length).toBeGreaterThan(0);
  });
});
