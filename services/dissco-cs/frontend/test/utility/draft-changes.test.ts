import { describe, expect, it } from 'vitest';

import { hasDraftChanged } from '../../src/utility/draft-changes';

describe('hasDraftChanged', () => {
  it('sees no change in an untouched draft', () => {
    expect(hasDraftChanged({ title: { nl: 'Hallo' }, isActive: true }, { title: { nl: 'Hallo' }, isActive: true })).toBe(false);
  });

  it('sees an edited text, also deep in the draft', () => {
    expect(hasDraftChanged({ title: { nl: 'Hallo!' } }, { title: { nl: 'Hallo' } })).toBe(true);
  });

  it('sees a text in a language that was empty', () => {
    expect(hasDraftChanged({ title: { nl: 'Hallo' } }, { title: {} })).toBe(true);
  });

  it('sees a switched toggle', () => {
    expect(hasDraftChanged({ isActive: false }, { isActive: true })).toBe(true);
  });

  it('treats text that was typed and erased again as no change', () => {
    expect(hasDraftChanged({ title: { nl: '' } }, { title: {} })).toBe(false);
    expect(hasDraftChanged({ startDate: '' }, { startDate: null })).toBe(false);
  });

  it('sees a picked file, and the same file as no change', () => {
    const file = new File(['logo'], 'logo.png');
    expect(hasDraftChanged({ logo: file }, { logo: null })).toBe(true);
    expect(hasDraftChanged({ logo: file }, { logo: file })).toBe(false);
  });

  it('sees a removed attachment, which is null next to a missing key', () => {
    expect(hasDraftChanged({ picked: { nl: null } }, { picked: {} })).toBe(true);
  });

  it('compares lists by their content', () => {
    expect(hasDraftChanged({ slugs: ['a', 'b'] }, { slugs: ['a', 'b'] })).toBe(false);
    expect(hasDraftChanged({ slugs: ['a'] }, { slugs: ['a', 'b'] })).toBe(true);
  });
});
