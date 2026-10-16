import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { contrastRatio, contrastWarnings, DEFAULT_SITE_COLORS, isHexColor } from '../../../../src/pages/site-management/site-colors/palette';

describe('DEFAULT_SITE_COLORS', () => {
  it('matches the defaults in citizen-science-theme.css', () => {
    const css = readFileSync(join(__dirname, '../../../../src/citizen-science-theme.css'), 'utf8');
    for (const [key, hex] of Object.entries(DEFAULT_SITE_COLORS)) {
      expect(css).toMatch(new RegExp(`--cs-${key}:\\s*${hex};`, 'i'));
    }
  });
});

describe('isHexColor', () => {
  it('accepts #rrggbb in either case', () => {
    expect(isHexColor('#1a5B66')).toBe(true);
  });

  it('rejects short, named and partly typed colors', () => {
    expect(isHexColor('#fff')).toBe(false);
    expect(isHexColor('teal')).toBe(false);
    expect(isHexColor('#1a5b6')).toBe(false);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for a color on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#1a5b66', '#1a5b66')).toBeCloseTo(1, 5);
  });

  it('does not depend on the order', () => {
    expect(contrastRatio('#ffffff', '#1a5b66')).toBeCloseTo(contrastRatio('#1a5b66', '#ffffff'), 10);
  });
});

describe('contrastWarnings', () => {
  it('warns for a light color that carries white text', () => {
    const warnings = contrastWarnings({ ...DEFAULT_SITE_COLORS, primary: '#a8e6cf' });
    expect(Object.keys(warnings)).toContain('primary');
    expect(warnings.primary).toBeLessThan(4.5);
  });

  it('never warns for accent, which carries no text', () => {
    expect(contrastWarnings({ ...DEFAULT_SITE_COLORS, accent: '#ffffff' })).not.toHaveProperty('accent');
  });

  it('skips a color that is still being typed', () => {
    expect(contrastWarnings({ ...DEFAULT_SITE_COLORS, primary: '#ff' })).not.toHaveProperty('primary');
  });
});
