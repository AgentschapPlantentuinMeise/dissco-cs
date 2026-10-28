import { describe, expect, it } from 'vitest';

import { planManualAttachments } from '../../src/controllers/manuals.logic';

const noText = {};
const allText = { nl: 'tekst', en: 'text', fr: 'texte', de: 'Text' };

describe('planManualAttachments', () => {
  it('accepts a new manual with a pdf in every language', () => {
    expect(planManualAttachments(noText, [], ['nl', 'en', 'fr', 'de'], [])).toEqual({
      ok: true,
      upload: ['nl', 'en', 'fr', 'de'],
      remove: [],
    });
  });

  it('replaces one stored attachment and keeps the others', () => {
    expect(planManualAttachments(noText, ['nl', 'en', 'fr', 'de'], ['en'], [])).toEqual({ ok: true, upload: ['en'], remove: [] });
  });

  it('removes every attachment when the text stays in every language', () => {
    expect(planManualAttachments(allText, ['nl', 'en', 'fr', 'de'], [], ['nl', 'en', 'fr', 'de'])).toEqual({
      ok: true,
      upload: [],
      remove: ['nl', 'en', 'fr', 'de'],
    });
  });

  it('ignores removing a language that has no attachment', () => {
    expect(planManualAttachments(allText, [], [], ['fr'])).toEqual({ ok: true, upload: [], remove: [] });
  });

  it('refuses a save that leaves one language without an attachment', () => {
    expect(planManualAttachments(noText, ['nl', 'en', 'fr', 'de'], [], ['fr']).ok).toBe(false);
    expect(planManualAttachments(noText, [], ['nl', 'en'], []).ok).toBe(false);
  });

  it('refuses a manual without text and without attachments', () => {
    expect(planManualAttachments(noText, [], [], []).ok).toBe(false);
  });

  it('refuses a language that gets a new attachment and loses it in the same save', () => {
    expect(planManualAttachments(noText, ['nl', 'en', 'fr', 'de'], ['nl'], ['nl']).ok).toBe(false);
  });
});
