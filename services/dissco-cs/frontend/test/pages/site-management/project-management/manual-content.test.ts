import { describe, expect, it } from 'vitest';
import { ManualSummaryDto } from '@dissco-cs/shared-types';

import {
  attachmentLangsAfterSave,
  checkManualContent,
  manualHasContent,
} from '../../../../src/pages/site-management/project-management/manual-content';

const allText = { nl: 'tekst', en: 'text', fr: 'texte', de: 'Text' };
const ALL = ['nl', 'en', 'fr', 'de'] as const;

function summary(content: ManualSummaryDto['content'], attachmentLangs: ManualSummaryDto['attachmentLangs']): ManualSummaryDto {
  return { id: 1, title: { nl: 'Handleiding' }, content, updatedAt: '2026-10-21T00:00:00Z', linkedProjectSlugs: [], attachmentLangs };
}

describe('checkManualContent', () => {
  it('has no content when there is neither text nor an attachment', () => {
    expect(checkManualContent({}, [])).toEqual({ missingLangs: [], hasContent: false });
  });

  it('accepts text in every language', () => {
    expect(checkManualContent(allText, [])).toEqual({ missingLangs: [], hasContent: true });
  });

  it('accepts an attachment in every language without text', () => {
    expect(checkManualContent({}, [...ALL])).toEqual({ missingLangs: [], hasContent: true });
  });

  it('names the languages without text once one language has text', () => {
    expect(checkManualContent({ nl: 'tekst', en: '  ' }, []).missingLangs).toEqual(['en', 'fr', 'de']);
  });

  it('names the languages without an attachment once one language has one', () => {
    expect(checkManualContent(allText, ['nl', 'fr']).missingLangs).toEqual(['en', 'de']);
  });

  it('does not accept text in one language and an attachment in another', () => {
    expect(checkManualContent({ nl: 'tekst' }, ['en']).missingLangs).toEqual(['nl', 'en', 'fr', 'de']);
  });
});

describe('manualHasContent', () => {
  it('is true for a complete manual, whatever its title', () => {
    expect(manualHasContent(summary(allText, []))).toBe(true);
  });

  it('is false for an empty or half-filled manual', () => {
    expect(manualHasContent(summary({}, []))).toBe(false);
    expect(manualHasContent(summary({ nl: 'tekst' }, []))).toBe(false);
  });
});

describe('attachmentLangsAfterSave', () => {
  const pdf = new File(['%PDF'], 'handleiding.pdf');

  it('keeps the stored attachments when nothing was picked', () => {
    expect(attachmentLangsAfterSave(['nl', 'en'], {})).toEqual(['nl', 'en']);
  });

  it('adds a picked file and drops a removed one', () => {
    expect(attachmentLangsAfterSave(['nl', 'en'], { en: null, fr: pdf })).toEqual(['nl', 'fr']);
  });
});
