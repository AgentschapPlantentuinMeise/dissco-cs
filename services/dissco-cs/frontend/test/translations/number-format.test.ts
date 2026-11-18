import { readFileSync } from 'fs';
import { join } from 'path';
import i18next from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';

// The translations format their own numbers ({{count, number}}, percent, decimals); this checks
// that i18next reads that notation the way we write it, with the real Dutch texts.
const nl = JSON.parse(readFileSync(join(__dirname, '..', '..', 'src', 'translations', 'nl', 'dissco-cs.json'), 'utf8'));
const i18n = i18next.createInstance();

beforeAll(async () => {
  await i18n.init({ lng: 'nl', resources: { nl: { 'dissco-cs': nl } }, defaultNS: 'dissco-cs', interpolation: { escapeValue: false } });
});

describe('numbers in the Dutch translations', () => {
  it('separates thousands', () => {
    expect(i18n.t('review_count_summary', { count: 1234, total: 5678 })).toBe('1.234 van 5.678 taken');
  });

  it('shows a share as a percentage with a decimal comma', () => {
    expect(i18n.t('my_tasks_percentage', { pct: 0.125, platformName: 'X' })).toBe('Jij bent goed voor 12,5% van alle bijdragen op X.');
  });

  it('rounds the contrast to one decimal', () => {
    expect(i18n.t('sm_colors_contrast_warning', { ratio: 3.14159, min: 4.5 })).toContain('contrast 3,1:1, aanbevolen is minstens 4,5:1');
  });

  it('writes a size with its unit', () => {
    expect(i18n.t('sm_manuals_attachment_too_large', { max: 8 })).toBe('Dit bestand is groter dan 8 MB.');
  });

  it('picks the singular or the plural', () => {
    expect(i18n.t('review_bulk_selected_count', { count: 1 })).toBe('1 taak geselecteerd');
    expect(i18n.t('review_bulk_selected_count', { count: 3 })).toBe('3 taken geselecteerd');
  });
});
