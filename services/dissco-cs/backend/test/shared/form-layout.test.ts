import { describe, expect, it } from 'vitest';

// The shared package has no test runner of its own; its pure helpers are tested here.
import { FormLayoutFieldDto, FormLayoutItem, checkFormLayout, formSaveSchema } from '@dissco-cs/shared-types';

function field(term: string, overrides: Partial<FormLayoutFieldDto> = {}): FormLayoutFieldDto {
  return { term, label: term, type: 'text-field', required: false, isEntity: false, inProjects: 1, ...overrides };
}

const title = { nl: 'Verzamelgegevens', en: 'Collection data', fr: 'Données de collecte', de: 'Sammeldaten' };

describe('checkFormLayout', () => {
  it('accepts loose rows and sections with every required field placed', () => {
    const items: FormLayoutItem[] = [
      { kind: 'row', terms: ['scientificName'] },
      { kind: 'section', title, rows: [{ kind: 'row', terms: ['dateFrom', 'dateTo'] }] },
    ];
    const fields = [field('scientificName', { required: true }), field('dateFrom', { required: true }), field('dateTo'), field('notes')];
    expect(checkFormLayout(items, fields)).toEqual([]);
  });

  it('reports a term placed twice, also across sections', () => {
    const items: FormLayoutItem[] = [
      { kind: 'row', terms: ['habitat'] },
      { kind: 'section', title, rows: [{ kind: 'row', terms: ['habitat'] }] },
    ];
    expect(checkFormLayout(items, [field('habitat')])).toEqual([{ kind: 'duplicate-term', term: 'habitat' }]);
  });

  it('reports a group of fields that shares its row', () => {
    const items: FormLayoutItem[] = [{ kind: 'row', terms: ['collector', 'habitat'] }];
    expect(checkFormLayout(items, [field('collector', { isEntity: true }), field('habitat')])).toEqual([
      { kind: 'entity-not-alone', term: 'collector' },
    ]);
  });

  it('accepts a group of fields alone on its row', () => {
    expect(checkFormLayout([{ kind: 'row', terms: ['collector'] }], [field('collector', { isEntity: true })])).toEqual([]);
  });

  it('reports a required field that is not placed, by its label', () => {
    const fields = [field('country', { required: true, label: 'Country' }), field('locality')];
    expect(checkFormLayout([{ kind: 'row', terms: ['locality'] }], fields)).toEqual([
      { kind: 'missing-required', term: 'country', label: 'Country' },
    ]);
  });

  it('allows a term that the models do not have (the layout may be a copy of another one)', () => {
    expect(checkFormLayout([{ kind: 'row', terms: ['oldField'] }], [field('habitat')])).toEqual([]);
  });
});

describe('formSaveSchema', () => {
  const save = (layout: unknown) =>
    formSaveSchema.safeParse({ formName: 'Review project 3', templateProjectId: null, institutionId: null, manualId: null, layout });

  it('accepts at most three fields on a row', () => {
    expect(save([{ kind: 'row', terms: ['a', 'b', 'c'] }]).success).toBe(true);
    expect(save([{ kind: 'row', terms: ['a', 'b', 'c', 'd'] }]).success).toBe(false);
    expect(save([{ kind: 'row', terms: [] }]).success).toBe(false);
  });

  it('requires a section title in every site language', () => {
    expect(save([{ kind: 'section', title, rows: [] }]).success).toBe(true);
    expect(save([{ kind: 'section', title: { ...title, de: '' }, rows: [] }]).success).toBe(false);
    expect(save([{ kind: 'section', title: { nl: 'Alleen nl' }, rows: [] }]).success).toBe(false);
  });

  it('keeps the form name exactly as Madoc has it, spaces included', () => {
    const parsed = formSaveSchema.parse({ formName: ' Review ', templateProjectId: null, institutionId: null, manualId: null, layout: [] });
    expect(parsed).toMatchObject({ formName: ' Review ' });
  });
});
