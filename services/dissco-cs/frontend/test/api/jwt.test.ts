import { afterEach, describe, expect, it, vi } from 'vitest';

import { getJwt } from '../../src/api/jwt';

// Madoc sets the JWT as a cookie named "madoc/<site slug>", with a slash in the name, next to a
// signature cookie "madoc/<site slug>.sig".
function onSiteWithCookies(cookie: string) {
  vi.stubGlobal('window', { location: { pathname: '/s/demo/projects', search: '' } });
  vi.stubGlobal('document', { cookie });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getJwt', () => {
  it('reads the cookie whose name contains a slash', () => {
    onSiteWithCookies('i18next=nl; madoc/demo=header.payload.signature; madoc/demo.sig=abc');
    expect(getJwt()).toBe('header.payload.signature');
  });

  it("does not pick up another site's token", () => {
    onSiteWithCookies('madoc/other=other.token.value; madoc/demo.sig=abc');
    expect(getJwt()).toBeUndefined();
  });

  it('is undefined without any cookie', () => {
    onSiteWithCookies('');
    expect(getJwt()).toBeUndefined();
  });
});
