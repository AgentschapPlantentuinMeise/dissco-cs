import { describe, expect, it } from 'vitest';
import { MadocAnnotationDocumentDto, MadocBaseFieldDto, MadocStructureNodeDto } from '@dissco-cs/shared-types';

import { collectFieldHelp, fieldHelpKey, helpModelsFor } from '../../../src/pages/annotate/field-help';

type ModelNode = MadocStructureNodeDto & { type: 'model' };

function field(overrides: Partial<MadocBaseFieldDto>): MadocBaseFieldDto {
  return { id: 'f', type: 'text-field', label: 'Field', value: '', ...overrides };
}

function entity(properties: MadocAnnotationDocumentDto['properties'], overrides: Partial<MadocAnnotationDocumentDto> = {}): MadocAnnotationDocumentDto {
  return { id: 'e', type: 'entity', properties, ...overrides };
}

function model(id: string, fields: ModelNode['fields'], overrides: Partial<ModelNode> = {}): ModelNode {
  return { id, label: id, type: 'model', fields, ...overrides };
}

describe('fieldHelpKey', () => {
  it('keeps the terms and drops the list positions', () => {
    expect(fieldHelpKey(['name', 0])).toBe('name');
    expect(fieldHelpKey(['identification', 2, 'name', 1])).toBe('identification.name');
  });
});

describe('helpModelsFor', () => {
  const single = model('m1', []);
  const sectionA = model('a', []);
  const sectionB = model('b', []);
  const root: MadocStructureNodeDto = {
    id: 'root',
    label: 'Root',
    type: 'choice',
    items: [single, { id: 'tabs', label: 'Tabs', type: 'choice', profile: ['tabs'], items: [sectionA, sectionB] }],
  };

  it('returns the active model itself', () => {
    expect(helpModelsFor(root, 'm1')).toEqual([single]);
  });

  it('returns every section of a choice shown as sections', () => {
    expect(helpModelsFor(root, 'tabs')).toEqual([sectionA, sectionB]);
  });

  it('returns nothing for an unknown id or a real choice', () => {
    expect(helpModelsFor(root, 'nope')).toEqual([]);
    expect(helpModelsFor(root, 'root')).toEqual([]);
  });
});

describe('collectFieldHelp', () => {
  it('collects the instructions and only the fields that have a description', () => {
    const document = entity({
      name: [field({ label: 'Name', description: ' Copy it as written. ' })],
      uses: [field({ label: 'Uses' })],
    });
    const help = collectFieldHelp([model('m1', ['name', 'uses'], { instructions: 'Read the whole label first.' })], document);
    expect(help).toEqual({
      instructions: ['Read the whole label first.'],
      groups: [{ key: 'm1', label: null, intro: null, items: [{ key: 'name', label: 'Name', description: 'Copy it as written.' }] }],
    });
  });

  it('gives an entity its own group, with its description as intro, read from the first copy', () => {
    const first = entity({ date: [field({ label: 'Date', description: 'One date? Fill in both.' })] }, { label: 'Collection', description: 'From the label.' });
    const second = entity({ date: [field({ label: 'Date', description: 'One date? Fill in both.' })] });
    const document = entity({ collection: [first, second] });
    const help = collectFieldHelp([model('m1', [['collection', ['date']]])], document);
    expect(help.groups).toEqual([
      { key: 'collection', label: 'Collection', intro: 'From the label.', items: [{ key: 'collection.date', label: 'Date', description: 'One date? Fill in both.' }] },
    ]);
  });

  it('skips a field hidden by its dependent-on condition', () => {
    const document = entity({
      cultivated: [field({ label: 'Cultivated', value: '' })],
      garden: [field({ label: 'Garden', description: 'Name of the garden.', dependent: 'cultivated' })],
    });
    expect(collectFieldHelp([model('m1', ['cultivated', 'garden'])], document).groups).toEqual([]);
  });

  it('labels the groups by section when the form shows several models', () => {
    const document = entity({ a: [field({ label: 'A', description: 'Help A' })], b: [field({ label: 'B' })] });
    const help = collectFieldHelp([model('s1', ['a'], { label: 'Section 1' }), model('s2', ['b'], { label: 'Section 2' })], document);
    expect(help.groups.map(group => group.label)).toEqual(['Section 1']);
  });

  it('puts the instructions of a section under that section, not above all sections', () => {
    const document = entity({ a: [field({ label: 'A' })], b: [field({ label: 'B' })] });
    const help = collectFieldHelp(
      [model('s1', ['a'], { label: 'Section 1' }), model('s2', ['b'], { label: 'Section 2', instructions: 'About the dates.' })],
      document
    );
    expect(help).toEqual({
      instructions: [],
      groups: [{ key: 's2', label: 'Section 2', intro: 'About the dates.', items: [] }],
    });
  });
});
