import { SiteColorKey, SiteColors } from '@dissco-cs/shared-types';

// Same values as citizen-science-theme.css (a test keeps the two equal): the starting point of the
// form for a site without a palette of its own.
export const DEFAULT_SITE_COLORS: SiteColors = {
  primary: '#1a5b66',
  secondary: '#00a877',
  accent: '#139b94',
  dark: '#124048',
  tertiary: '#6e3466',
};

// The colors that carry white text somewhere on the site (buttons, bands, badges); accent only
// colors gradients and focus rings.
const CARRIES_WHITE_TEXT: SiteColorKey[] = ['primary', 'secondary', 'dark', 'tertiary'];

// WCAG AA for normal text.
export const MIN_CONTRAST = 4.5;

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// The WCAG contrast ratio of two '#rrggbb' colors: 1 (same) up to 21 (black on white).
export function contrastRatio(hexA: string, hexB: string): number {
  const [light, dark] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

// Per color that carries white text: its contrast with white, when that is below MIN_CONTRAST.
export function contrastWarnings(colors: SiteColors): Partial<Record<SiteColorKey, number>> {
  const warnings: Partial<Record<SiteColorKey, number>> = {};
  for (const key of CARRIES_WHITE_TEXT) {
    if (!isHexColor(colors[key])) {
      continue;
    }
    const ratio = contrastRatio(colors[key], '#ffffff');
    if (ratio < MIN_CONTRAST) {
      warnings[key] = ratio;
    }
  }
  return warnings;
}
