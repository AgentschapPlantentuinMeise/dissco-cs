import { afterEach, describe, expect, it, vi } from 'vitest';

import { currentLocation, urlPath, withQuery, withSite } from '../../src/api/url';

function onPage(pathname: string, search = '') {
  vi.stubGlobal('window', { location: { pathname, search } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('urlPath', () => {
  it('encodes every value but not the fixed text', () => {
    expect(urlPath`/projects/${'a/b c?d#e'}/manual`).toBe('/projects/a%2Fb%20c%3Fd%23e/manual');
  });

  it('turns numbers into text', () => {
    expect(urlPath`/forum/topics/${12}/replies/${3}`).toBe('/forum/topics/12/replies/3');
  });

  it('leaves a path without values unchanged', () => {
    expect(urlPath`/stats`).toBe('/stats');
  });
});

describe('withQuery', () => {
  it('adds the parameters in order and leaves out undefined and null', () => {
    expect(withQuery('/tasks', { page: 1, status: undefined, all: true, q: null })).toBe('/tasks?page=1&all=true');
  });

  it('encodes values', () => {
    expect(withQuery('/find', { q: 'a&b=c' })).toBe('/find?q=a%26b%3Dc');
  });

  it('returns the path unchanged when no parameter is left', () => {
    expect(withQuery('/tasks', {})).toBe('/tasks');
    expect(withQuery('/tasks', { page: undefined })).toBe('/tasks');
  });
});

describe('withSite', () => {
  it('puts the site slug first', () => {
    onPage('/s/demo/projects');
    expect(withSite('/projects', { page: 2 })).toBe('/projects?slug=demo&page=2');
  });

  it('works without extra parameters', () => {
    onPage('/s/demo/');
    expect(withSite('/nav-items')).toBe('/nav-items?slug=demo');
  });
});

describe('currentLocation', () => {
  it('is the path with its query, for a redirect parameter', () => {
    onPage('/s/demo/projects/7', '?tab=tasks');
    expect(currentLocation()).toBe('/s/demo/projects/7?tab=tasks');
    expect(withQuery('/login', { redirect: currentLocation() })).toBe('/login?redirect=%2Fs%2Fdemo%2Fprojects%2F7%3Ftab%3Dtasks');
  });
});
