import { describe, expect, it } from 'vitest';
import { MadocAnnotationDocumentDto, MadocBaseFieldDto, MadocStructureNodeDto } from '@dissco-cs/shared-types';

import {
  collectMissingRequiredLabels,
  hasVisibleRequiredField,
  isDependentSatisfied,
  isFieldEmpty,
  isRequired,
  resolveSectionModels,
  resolveSingleChoice,
} from '../../../../src/pages/annotate/form/capture-model-rules';

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
