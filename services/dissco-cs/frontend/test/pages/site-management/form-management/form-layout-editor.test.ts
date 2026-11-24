import { describe, expect, it } from 'vitest';
import { FormLayoutFieldDto, FormLayoutItem } from '@dissco-cs/shared-types';

import {
  addSection,
  canJoinRow,
  dropId,
  dropTerm,
  missingTitleLangs,
  parseDropId,
  moveItem,
  placeAsNewRow,
  placeInRow,
  placedTerms,
  previewModel,
  removeSection,
  setSectionTitle,
  unplace,
} from '../../../../src/pages/site-management/form-management/form-layout-editor';

function field(term: string, overrides: Partial<FormLayoutFieldDto> = {}): FormLayoutFieldDto {
  return { term, label: term, type: 'text-field', required: false, isEntity: false, inProjects: 1, ...overrides };
}

const title = { nl: 'Plaats', en: 'Place', fr: 'Lieu', de: 'Ort' };
const layout: FormLayoutItem[] = [
  { kind: 'row', terms: ['scientificName'] },
  { kind: 'section', title, rows: [{ kind: 'row', terms: ['dateFrom', 'dateTo'] }, { kind: 'row', terms: ['habitat'] }] },
];
const fields = ['scientificName', 'dateFrom', 'dateTo', 'habitat', 'country'].map(term => field(term));

describe('placeAsNewRow', () => {
  it('adds an unplaced field as a loose row before the given row', () => {
    expect(placeAsNewRow(layout, 'country', { section: null, index: 0 })[0]).toEqual({ kind: 'row', terms: ['country'] });
  });

  it('moves a field out of its row into a new row of a section, and drops the row it emptied', () => {
    const next = placeAsNewRow(layout, 'scientificName', { section: 1, index: 2 });
    expect(next).toEqual([
      { kind: 'section', title, rows: [{ kind: 'row', terms: ['dateFrom', 'dateTo'] }, { kind: 'row', terms: ['habitat'] }, { kind: 'row', terms: ['scientificName'] }] },
    ]);
  });

  it('splits a field off its row', () => {
    const next = placeAsNewRow(layout, 'dateTo', { section: 1, index: 1 });
    expect(next[1]).toEqual({ kind: 'section', title, rows: [{ kind: 'row', terms: ['dateFrom'] }, { kind: 'row', terms: ['dateTo'] }, { kind: 'row', terms: ['habitat'] }] });
  });
});

describe('placeInRow and canJoinRow', () => {
  it('adds a field to a row that has room', () => {
    const next = placeInRow(layout, 'habitat', { section: 1, index: 0 }, fields);
    expect(next[1]).toEqual({ kind: 'section', title, rows: [{ kind: 'row', terms: ['dateFrom', 'dateTo', 'habitat'] }] });
  });

  it('refuses a fourth field on a row', () => {
    const full: FormLayoutItem[] = [{ kind: 'row', terms: ['a', 'b', 'c'] }];
    expect(canJoinRow(full, 'd', { section: null, index: 0 }, fields)).toBe(false);
    expect(placeInRow(full, 'd', { section: null, index: 0 }, fields)).toBe(full);
  });

  it('keeps a group of fields (entity) on a row of its own', () => {
    const withEntity = [...fields, field('collector', { isEntity: true })];
    const items: FormLayoutItem[] = [{ kind: 'row', terms: ['collector'] }, { kind: 'row', terms: ['habitat'] }];
    expect(canJoinRow(items, 'habitat', { section: null, index: 0 }, withEntity)).toBe(false);
    expect(canJoinRow(items, 'collector', { section: null, index: 1 }, withEntity)).toBe(false);
  });

  it('keeps the target row in place when the moved field leaves a row before it', () => {
    const items: FormLayoutItem[] = [{ kind: 'row', terms: ['habitat'] }, { kind: 'row', terms: ['country'] }];
    expect(placeInRow(items, 'habitat', { section: null, index: 1 }, fields)).toEqual([{ kind: 'row', terms: ['country', 'habitat'] }]);
  });
});

describe('unplace', () => {
  it('takes a field out and drops its emptied row', () => {
    expect(placedTerms(unplace(layout, 'scientificName')).has('scientificName')).toBe(false);
    expect(unplace(layout, 'scientificName')).toHaveLength(1);
  });
});

describe('sections', () => {
  it('adds an empty section at the end, and removing it keeps its rows as loose rows', () => {
    const withSection = addSection(layout);
    expect(withSection[2]).toEqual({ kind: 'section', title: {}, rows: [] });
    expect(removeSection(layout, 1)).toEqual([
      { kind: 'row', terms: ['scientificName'] },
      { kind: 'row', terms: ['dateFrom', 'dateTo'] },
      { kind: 'row', terms: ['habitat'] },
    ]);
  });

  it('moves an item up or down, but not past the ends', () => {
    expect(moveItem(layout, 1, -1).map(item => item.kind)).toEqual(['section', 'row']);
    expect(moveItem(layout, 0, -1)).toBe(layout);
  });

  it('knows which languages still miss a section title', () => {
    const untitled = addSection(layout);
    expect(missingTitleLangs(untitled)).toEqual(['nl', 'en', 'fr', 'de']);
    expect(missingTitleLangs(setSectionTitle(untitled, 2, 'nl', 'Overig'))).toEqual(['en', 'fr', 'de']);
    expect(missingTitleLangs(layout)).toEqual([]);
  });
});

describe('dropId, parseDropId and dropTerm', () => {
  it('reads back every kind of drop target', () => {
    const targets = [
      { kind: 'gap' as const, place: { section: null, index: 3 } },
      { kind: 'row' as const, place: { section: 1, index: 0 } },
      { kind: 'unplaced' as const },
    ];
    for (const target of targets) {
      expect(parseDropId(dropId(target))).toEqual(target);
    }
    expect(parseDropId('something-else')).toBeNull();
  });

  it('a drop on the unplaced list takes the field out, a drop on a row joins it', () => {
    expect(placedTerms(dropTerm(layout, 'habitat', { kind: 'unplaced' }, fields)).has('habitat')).toBe(false);
    expect(dropTerm(layout, 'country', { kind: 'row', place: { section: null, index: 0 } }, fields)[0]).toEqual({
      kind: 'row',
      terms: ['scientificName', 'country'],
    });
  });
});

describe('previewModel', () => {
  it('turns the fields into an empty document, with a group of fields as a nested entry', () => {
    const { fields: modelFields, document } = previewModel([field('habitat', { required: true }), field('collector', { isEntity: true, label: 'Collector' })]);
    expect(modelFields).toEqual(['habitat', ['collector', []]]);
    expect(document.properties.habitat).toEqual([{ id: 'habitat', type: 'text-field', label: 'habitat', required: true, value: '' }]);
    expect(document.properties.collector).toEqual([{ id: 'collector', type: 'entity', label: 'Collector', required: false, properties: {} }]);
  });
});
