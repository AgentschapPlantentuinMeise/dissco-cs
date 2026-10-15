import { describe, expect, it } from 'vitest';

// The shared package has no test runner of its own; its pure helpers are tested here.
import { firstFilledLang, slugify } from '@dissco-cs/shared-types';

describe('slugify', () => {
  it('strips accents, lowercases and joins words with single dashes', () => {
    expect(slugify('Plantentuin Meisé', 'x')).toBe('plantentuin-meise');
    expect(slugify('  Jardin  botanique -- de Meise! ', 'x')).toBe('jardin-botanique-de-meise');
    expect(slugify('Botanischer Garten Köln', 'x')).toBe('botanischer-garten-koln');
  });

  it('falls back when nothing usable is left', () => {
    expect(slugify('!!!', 'instituut')).toBe('instituut');
    expect(slugify('', 'project')).toBe('project');
  });
});

describe('firstFilledLang', () => {
  it('takes the first filled-in language in site order nl, en, fr, de', () => {
    expect(firstFilledLang({ fr: 'Bonjour', en: 'Hello' })).toBe('Hello');
    expect(firstFilledLang({ de: 'Hallo', nl: '' })).toBe('Hallo');
  });

  it('gives undefined when nothing is filled in', () => {
    expect(firstFilledLang({ nl: '', en: '' })).toBeUndefined();
    expect(firstFilledLang(undefined)).toBeUndefined();
  });
});
