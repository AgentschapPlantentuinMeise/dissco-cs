import { describe, expect, it } from 'vitest';

import { backHref } from '../../src/utility/back-href';

describe('backHref', () => {
  it('goes back to the overview page the user came from', () => {
    expect(backHref({ from: { pathname: '/explore', search: '?page=3' } }, '/explore')).toBe('/explore?page=3');
  });

  it('goes to the overview itself when the user came from elsewhere', () => {
    expect(backHref({ from: { pathname: '/', search: '' } }, '/explore')).toBe('/explore');
    expect(backHref({ from: { pathname: '/institutions/meise', search: '?page=2' } }, '/explore')).toBe('/explore');
  });

  it('goes to the overview itself without or with unknown state', () => {
    expect(backHref(null, '/explore')).toBe('/explore');
    expect(backHref(undefined, '/explore')).toBe('/explore');
    expect(backHref({ from: 'x' }, '/explore')).toBe('/explore');
  });
});
