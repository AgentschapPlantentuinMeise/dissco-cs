import { describe, expect, it } from 'vitest';

import { isOwnScriptError } from '../../src/api/uncaught-errors';

const ORIGIN = 'https://cs.example.org';

describe('isOwnScriptError', () => {
  it('reports an error thrown in our own code', () => {
    expect(isOwnScriptError({ error: new Error('boom'), filename: `${ORIGIN}/assets/index-abc.js` }, ORIGIN)).toBe(true);
  });

  it('reports an error whose file the browser does not know', () => {
    expect(isOwnScriptError({ error: new Error('boom'), filename: '' }, ORIGIN)).toBe(true);
  });

  it('skips an error from a script of another origin, e.g. a browser extension', () => {
    expect(isOwnScriptError({ error: new Error('boom'), filename: 'chrome-extension://abc/content.js' }, ORIGIN)).toBe(false);
  });

  it('skips an error the browser hid ("Script error." without an error object)', () => {
    expect(isOwnScriptError({ error: null, filename: '' }, ORIGIN)).toBe(false);
  });
});
