import { describe, expect, it } from 'vitest';

import { isWebLink, plainText } from '../../../src/pages/annotate/manifest-info';

describe('plainText', () => {
  it('drops the markup and keeps the text', () => {
    expect(plainText('Collected by <i>J. Smith</i>')).toBe('Collected by J. Smith');
    expect(plainText('<a href="https://x.org">x.org</a>')).toBe('x.org');
  });

  it('turns a <br> into a line break and decodes the common entities', () => {
    expect(plainText('Line 1<br/>Line 2 &amp; more')).toBe('Line 1\nLine 2 & more');
  });
});

describe('isWebLink', () => {
  it('is true only for a value that is just a web address', () => {
    expect(isWebLink('https://www.plantentuinmeise.be/collectie')).toBe(true);
    expect(isWebLink('see https://x.org')).toBe(false);
    expect(isWebLink('javascript:alert(1)')).toBe(false);
  });
});
