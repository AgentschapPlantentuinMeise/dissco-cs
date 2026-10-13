import { describe, expect, it } from 'vitest';
import { MadocAnnotationDocumentDto, MadocBaseFieldDto, MadocCaptureModelDto } from '@dissco-cs/shared-types';

import {
  collectSelectorStates,
  createBlankDocument,
  getFieldValue,
  pathsEqual,
  setFieldSelector,
  setFieldValue,
} from '../../src/utility/annotation-document';

// A small capture model: one top-level field with a drawn region, and one nested entity ("author")
// holding a field with a region and a field without a selector.
function makeModel(): MadocCaptureModelDto {
  return {
    structure: { id: 'structure', label: 'Root', type: 'choice', items: [] },
    document: {
      id: 'root',
      type: 'entity',
      properties: {
        title: [
          {
            id: 'f-title',
            type: 'text-field',
            label: 'Title',
            value: 'previous contribution',
            revision: 'r-old',
            selector: { id: 's-title', type: 'box-selector', state: { x: 1, y: 2, width: 3, height: 4 }, revisionId: 'r-old', revises: 's-prev' },
          },
        ],
        author: [
          {
            id: 'e-author',
            type: 'entity',
            properties: {
              name: [
                {
                  id: 'f-name',
                  type: 'text-field',
                  label: 'Name',
                  value: 'Jan',
                  selector: { id: 's-name', type: 'box-selector', state: { x: 10, y: 20, width: 30, height: 40 } },
                },
              ],
              note: [{ id: 'f-note', type: 'text-field', label: 'Note', value: '' }],
            },
          },
        ],
      },
    },
  };
}

function fieldAt(document: MadocAnnotationDocumentDto, term: string): MadocBaseFieldDto {
  return document.properties[term][0] as MadocBaseFieldDto;
}

describe('createBlankDocument', () => {
  it('clears values, revision tags and selector state, also in nested entities', () => {
    const blank = createBlankDocument(makeModel());

    const title = fieldAt(blank, 'title');
    expect(title.value).toBeUndefined();
    expect(title.revision).toBeUndefined();
    expect(title.selector).toMatchObject({ state: null, revisionId: null, revises: null });

    expect(getFieldValue(blank, ['author', 0, 'name', 0])).toBeUndefined();
  });

  it('keeps the same fields and leaves the model itself untouched', () => {
    const model = makeModel();
    const blank = createBlankDocument(model);

    expect(Object.keys(blank.properties)).toEqual(['title', 'author']);
    expect(fieldAt(model.document, 'title').value).toBe('previous contribution');
    expect(fieldAt(model.document, 'title').selector?.state).not.toBeNull();
  });
});

describe('setFieldValue', () => {
  it('sets the value and tags the field with the revision id', () => {
    const updated = setFieldValue(makeModel().document, ['title', 0], 'new title', 'r-new');

    expect(fieldAt(updated, 'title')).toMatchObject({ value: 'new title', revision: 'r-new' });
  });

  it('returns a new document and leaves the original unchanged', () => {
    const original = makeModel().document;
    const updated = setFieldValue(original, ['title', 0], 'new title', 'r-new');

    expect(updated).not.toBe(original);
    expect(fieldAt(original, 'title').value).toBe('previous contribution');
    // Untouched branches are shared, not copied.
    expect(updated.properties.author).toBe(original.properties.author);
  });

  it('updates a field inside a nested entity', () => {
    const updated = setFieldValue(makeModel().document, ['author', 0, 'name', 0], 'Piet', 'r-new');

    expect(getFieldValue(updated, ['author', 0, 'name', 0])).toBe('Piet');
  });

  it('throws on a path that is too short, does not exist, or points at an entity', () => {
    const document = makeModel().document;

    expect(() => setFieldValue(document, ['title'], 'x', 'r')).toThrow('Invalid document path');
    expect(() => setFieldValue(document, ['missing', 0], 'x', 'r')).toThrow('No entry at missing[0]');
    expect(() => setFieldValue(document, ['author', 0], 'x', 'r')).toThrow('resolves to an entity');
  });
});

describe('setFieldSelector', () => {
  it('stores the drawn region on the field selector', () => {
    const region = { x: 5, y: 6, width: 7, height: 8 };
    const updated = setFieldSelector(makeModel().document, ['title', 0], region, 'r-new');

    expect(fieldAt(updated, 'title').selector?.state).toEqual(region);
    expect(fieldAt(updated, 'title').revision).toBe('r-new');
  });

  it('throws when the field has no selector configured', () => {
    const region = { x: 0, y: 0, width: 1, height: 1 };

    expect(() => setFieldSelector(makeModel().document, ['author', 0, 'note', 0], region, 'r')).toThrow('has no selector configured');
  });
});

describe('getFieldValue', () => {
  it('reads a top-level and a nested value', () => {
    const document = makeModel().document;

    expect(getFieldValue(document, ['title', 0])).toBe('previous contribution');
    expect(getFieldValue(document, ['author', 0, 'name', 0])).toBe('Jan');
  });

  it('returns undefined for an unknown path or a path ending on an entity', () => {
    const document = makeModel().document;

    expect(getFieldValue(document, ['missing', 0])).toBeUndefined();
    expect(getFieldValue(document, ['author', 0])).toBeUndefined();
  });
});

describe('collectSelectorStates', () => {
  it('finds every drawn region, including nested ones, with its path', () => {
    const entries = collectSelectorStates(makeModel().document);

    expect(entries).toEqual([
      { path: ['title', 0], id: 'f-title', state: { x: 1, y: 2, width: 3, height: 4 } },
      { path: ['author', 0, 'name', 0], id: 'f-name', state: { x: 10, y: 20, width: 30, height: 40 } },
    ]);
  });

  it('finds nothing in a blank document', () => {
    expect(collectSelectorStates(createBlankDocument(makeModel()))).toEqual([]);
  });
});

describe('pathsEqual', () => {
  it('compares paths by value', () => {
    expect(pathsEqual(['author', 0, 'name', 0], ['author', 0, 'name', 0])).toBe(true);
    expect(pathsEqual(['author', 0], ['author', 1])).toBe(false);
    expect(pathsEqual(['author', 0], ['author', 0, 'name', 0])).toBe(false);
  });

  it('treats a missing path as equal only to another missing path of the same kind', () => {
    expect(pathsEqual(null, null)).toBe(true);
    expect(pathsEqual(undefined, undefined)).toBe(true);
    expect(pathsEqual(null, undefined)).toBe(false);
    expect(pathsEqual(['title', 0], null)).toBe(false);
  });
});
