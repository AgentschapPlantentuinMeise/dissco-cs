import { describe, expect, it } from 'vitest';
import { MadocAnnotationDocumentDto, MadocBaseFieldDto, MadocStructureNodeDto, isRequired } from '@dissco-cs/shared-types';

import {
  applyFormLayout,
  collectMissingRequiredLabels,
  groupRangeFields,
  hasVisibleRequiredField,
  isDependentSatisfied,
  isFieldEmpty,
  resolveSectionModels,
  resolveSingleChoice,
} from '../../../src/components/capture-model-form/capture-model-rules';

function field(overrides: Partial<MadocBaseFieldDto>): MadocBaseFieldDto {
  return { id: 'f', type: 'text-field', label: 'Field', value: '', ...overrides };
}

function entity(properties: MadocAnnotationDocumentDto['properties'], overrides: Partial<MadocAnnotationDocumentDto> = {}): MadocAnnotationDocumentDto {
  return { id: 'e', type: 'entity', properties, ...overrides };
}

describe('isRequired', () => {
  it("accepts a boolean and Madoc's ['on'] array", () => {
    expect(isRequired(true)).toBe(true);
    expect(isRequired(['on'])).toBe(true);
    expect(isRequired([])).toBe(false);
    expect(isRequired(undefined)).toBe(false);
  });
});

describe('isFieldEmpty', () => {
  it('treats an empty value as empty and a drawn region as filled', () => {
    expect(isFieldEmpty(field({ value: '' }))).toBe(true);
    expect(isFieldEmpty(field({ value: 'x' }))).toBe(false);
    expect(isFieldEmpty(field({ value: '', selector: { id: 's', type: 'box-selector', state: { x: 0, y: 0, width: 1, height: 1 } } }))).toBe(false);
  });

  it('counts a checkbox list as filled only when an option is checked', () => {
    expect(isFieldEmpty(field({ value: { a: false, b: false } }))).toBe(true);
    expect(isFieldEmpty(field({ value: { a: false, b: true } }))).toBe(false);
  });
});

describe('isDependentSatisfied', () => {
  it('shows a field without a dependency, and one whose sibling has a value', () => {
    const document = entity({ kind: [field({ value: 'tree' })], empty: [field({ value: '' })] });
    expect(isDependentSatisfied(undefined, document)).toBe(true);
    expect(isDependentSatisfied('kind', document)).toBe(true);
    expect(isDependentSatisfied('empty', document)).toBe(false);
  });

  it('looks inside an entity sibling', () => {
    const document = entity({ author: [entity({ name: [field({ value: '' })] })] });
    expect(isDependentSatisfied('author', document)).toBe(false);
  });
});

describe('required fields', () => {
  const document = entity({
    title: [field({ label: 'Title', required: ['on'], value: '' })],
    note: [field({ label: 'Note', value: '' })],
    // Hidden until "note" has a value, so not required yet.
    detail: [field({ label: 'Detail', required: true, value: '', dependent: 'note' })],
    author: [entity({ name: [field({ label: 'Name', required: true, value: '' })] }, { label: 'Author' })],
  });
  const fields = ['title', 'note', 'detail', ['author', ['name']]] as const;

  it('lists the labels of empty required fields, skipping hidden ones', () => {
    expect(collectMissingRequiredLabels([...fields] as never, document)).toEqual(['Title', 'Name']);
  });

  it('knows whether any visible field is required', () => {
    expect(hasVisibleRequiredField([...fields] as never, document)).toBe(true);
    expect(hasVisibleRequiredField(['note', 'detail'], document)).toBe(false);
  });

  it('reports a required entity that is completely empty by its label', () => {
    const withRequiredEntity = entity({ author: [entity({ name: [field({ value: '' })] }, { label: 'Author', required: true })] });
    expect(collectMissingRequiredLabels([['author', ['name']]], withRequiredEntity)).toEqual(['Author']);
  });
});

describe('structure', () => {
  const model = (id: string): MadocStructureNodeDto => ({ id, label: id, type: 'model', fields: [] });

  it('skips a choice with a single item', () => {
    const root: MadocStructureNodeDto = { id: 'c', label: 'c', type: 'choice', items: [{ id: 'c2', label: 'c2', type: 'choice', items: [model('m')] }] };
    expect(resolveSingleChoice(root).id).toBe('m');
  });

  it("only shows sections for a choice with the 'tabs' profile", () => {
    const plain: MadocStructureNodeDto = { id: 'c', label: 'c', type: 'choice', items: [model('a'), model('b')] };
    expect(resolveSectionModels(plain)).toBeNull();
    expect(resolveSectionModels({ ...plain, profile: ['tabs'] })?.map(m => m.id)).toEqual(['a', 'b']);
  });
});

describe('groupRangeFields', () => {
  it('pairs adjacent <prefix>From / <prefix>To terms, with or without a separator', () => {
    expect(groupRangeFields(['collectionDateFrom', 'collectionDateTo'])).toEqual([{ kind: 'row', terms: ['collectionDateFrom', 'collectionDateTo'] }]);
    expect(groupRangeFields(['depth_from', 'depth_to'])).toEqual([{ kind: 'row', terms: ['depth_from', 'depth_to'] }]);
    expect(groupRangeFields(['altitude-FROM', 'Altitude-to'])).toEqual([{ kind: 'row', terms: ['altitude-FROM', 'Altitude-to'] }]);
  });

  it('keeps fields apart when they are not adjacent, reversed or have another prefix', () => {
    const entries = (fields: string[]) => fields.map(entry => ({ kind: 'entry', entry }));
    expect(groupRangeFields(['dateFrom', 'locality', 'dateTo'])).toEqual(entries(['dateFrom', 'locality', 'dateTo']));
    expect(groupRangeFields(['dateTo', 'dateFrom'])).toEqual(entries(['dateTo', 'dateFrom']));
    expect(groupRangeFields(['dateFrom', 'depthTo'])).toEqual(entries(['dateFrom', 'depthTo']));
  });

  it('leaves a nested entity as its own row', () => {
    expect(groupRangeFields(['dateFrom', ['dateTo', ['x']]])).toEqual([
      { kind: 'entry', entry: 'dateFrom' },
      { kind: 'entry', entry: ['dateTo', ['x']] },
    ]);
  });
});

describe('applyFormLayout', () => {
  const title = { nl: 'Verzamelgegevens', en: 'Collection data', fr: 'Données de collecte', de: 'Sammeldaten' };

  it('places loose rows and sections in the order of the layout', () => {
    const blocks = applyFormLayout(
      [
        { kind: 'row', terms: ['scientificName'] },
        { kind: 'section', title, rows: [{ kind: 'row', terms: ['day', 'month', 'year'] }, { kind: 'row', terms: ['habitat'] }] },
      ],
      ['habitat', 'year', 'month', 'day', 'scientificName']
    );
    expect(blocks).toEqual([
      { kind: 'entry', entry: 'scientificName' },
      {
        kind: 'section',
        title,
        rows: [
          { kind: 'row', terms: ['day', 'month', 'year'] },
          { kind: 'entry', entry: 'habitat' },
        ],
      },
    ]);
  });

  it('puts the fields the layout does not place last, with the From/To rule', () => {
    expect(applyFormLayout([{ kind: 'row', terms: ['habitat'] }], ['dateFrom', 'dateTo', 'habitat', 'country'])).toEqual([
      { kind: 'entry', entry: 'habitat' },
      { kind: 'row', terms: ['dateFrom', 'dateTo'] },
      { kind: 'entry', entry: 'country' },
    ]);
  });

  it('skips terms the model does not have and drops a section left empty', () => {
    const blocks = applyFormLayout(
      [
        { kind: 'row', terms: ['oldField', 'habitat'] },
        { kind: 'section', title, rows: [{ kind: 'row', terms: ['gone'] }] },
      ],
      ['habitat']
    );
    expect(blocks).toEqual([{ kind: 'entry', entry: 'habitat' }]);
  });

  it('places a term only once, even when the layout repeats it', () => {
    expect(applyFormLayout([{ kind: 'row', terms: ['habitat'] }, { kind: 'row', terms: ['habitat'] }], ['habitat'])).toEqual([
      { kind: 'entry', entry: 'habitat' },
    ]);
  });

  it('gives a group of fields (entity) a block of its own, also when the layout put it in a row', () => {
    const collector: [string, string[]] = ['collector', ['name']];
    expect(applyFormLayout([{ kind: 'row', terms: ['collector', 'habitat'] }], [collector, 'habitat'])).toEqual([
      { kind: 'entry', entry: collector },
      { kind: 'entry', entry: 'habitat' },
    ]);
  });
});
