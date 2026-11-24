import { describe, expect, it } from 'vitest';
import { MadocAnnotationDocumentDto, MadocBaseFieldDto, MadocCaptureModelDto, MadocModelFields, MadocProjectDto, MadocProjectStatus } from '@dissco-cs/shared-types';

import {
  collectLayoutFields,
  formNamesBySlug,
  groupProjectsByFormName,
  institutionIdsBySlug,
  isActiveProject,
  projectsWithFormName,
  slugsWithFormNames,
} from '../../src/logic/forms.logic';

function project(id: number, modelId: string, status: MadocProjectStatus = 1): MadocProjectDto {
  return { id, collection_id: id, slug: `p${id}`, task_id: `t${id}`, capture_model_id: modelId, label: { en: [`Project ${id}`] }, status };
}

function field(label: string, overrides: Partial<MadocBaseFieldDto> = {}): MadocBaseFieldDto {
  return { id: label, type: 'text-field', label, value: '', ...overrides };
}

function model(fields: MadocModelFields, properties: MadocAnnotationDocumentDto['properties']): MadocCaptureModelDto {
  return {
    structure: { id: 's', label: 'Review project 3', type: 'choice', items: [{ id: 'm', label: 'Default', type: 'model', fields }] },
    document: { id: 'd', type: 'entity', properties },
  };
}

const models = [
  { id: 'model-a', label: 'Review project 3' },
  { id: 'model-b', label: 'Review project 3' },
  { id: 'model-c', label: 'fgdsdfg' },
];

describe('projectsWithFormName and isActiveProject', () => {
  it('finds the projects whose own model carries the label', () => {
    const projects = [project(1, 'model-a'), project(2, 'model-b'), project(3, 'model-c'), project(4, 'unknown')];
    expect(projectsWithFormName(projects, models, 'Review project 3').map(p => p.id)).toEqual([1, 2]);
  });

  it('counts every status except archived as active', () => {
    expect(isActiveProject(project(1, 'model-a', 0))).toBe(true);
    expect(isActiveProject(project(1, 'model-a', 2))).toBe(true);
    expect(isActiveProject(project(1, 'model-a', 3))).toBe(false);
  });
});

describe('groupProjectsByFormName', () => {
  const layout = [{ kind: 'row' as const, terms: ['habitat'] }];

  it('groups projects per form name, sorted, with what is stored for each form', () => {
    const groups = groupProjectsByFormName(
      [project(1, 'model-a'), project(2, 'model-b'), project(3, 'model-c')],
      models,
      [{ formName: 'Review project 3', templateProjectId: null, institutionId: 5, manualId: null, layout }]
    );
    expect(groups.map(group => [group.formName, group.institutionId, group.layout, group.projects.map(p => p.id)])).toEqual([
      ['fgdsdfg', null, null, [3]],
      ['Review project 3', 5, layout, [1, 2]],
    ]);
  });

  it('lists a stored form whose name no project has any more, without projects', () => {
    const groups = groupProjectsByFormName([project(3, 'model-c')], models, [
      { formName: 'Renamed away', templateProjectId: null, institutionId: null, manualId: 2, layout },
    ]);
    expect(groups.find(group => group.formName === 'Renamed away')).toEqual({
      formName: 'Renamed away',
      templateProjectId: null,
      institutionId: null,
      manualId: 2,
      layout,
      projects: [],
    });
  });

  it('leaves out a stored form with nothing set, as if it were not stored', () => {
    const groups = groupProjectsByFormName([project(3, 'model-c')], models, [
      { formName: 'Emptied', templateProjectId: null, institutionId: null, manualId: null, layout: null },
    ]);
    expect(groups.map(group => group.formName)).toEqual(['fgdsdfg']);
  });

  it('keeps a template project that has the form, and drops one that no longer has it', () => {
    const groups = groupProjectsByFormName([project(1, 'model-a'), project(3, 'model-c')], models, [
      { formName: 'Review project 3', templateProjectId: 1, institutionId: null, manualId: null, layout: null },
      { formName: 'fgdsdfg', templateProjectId: 1, institutionId: null, manualId: null, layout: null },
    ]);
    expect(groups.map(group => [group.formName, group.templateProjectId])).toEqual([
      ['fgdsdfg', null],
      ['Review project 3', 1],
    ]);
  });
});

describe('collectLayoutFields', () => {
  it('lists the fields in structure order, with a group of fields as one entry', () => {
    const fields = collectLayoutFields([
      model(['habitat', ['collector', ['name']], 'cultivated'], {
        habitat: [field('Habitat')],
        collector: [{ id: 'e', type: 'entity', label: 'Collector', required: ['on'], properties: { name: [field('Name')] } }],
        cultivated: [field('Cultivated?', { type: 'checkbox-field' })],
      }),
    ]);
    expect(fields).toEqual([
      { term: 'habitat', label: 'Habitat', type: 'text-field', required: false, isEntity: false, inProjects: 1 },
      { term: 'collector', label: 'Collector', type: 'entity', required: true, isEntity: true, inProjects: 1 },
      { term: 'cultivated', label: 'Cultivated?', type: 'checkbox-field', required: false, isEntity: false, inProjects: 1 },
    ]);
  });

  it('merges the models of several projects: counts each field, and required in one means required', () => {
    const fields = collectLayoutFields([
      model(['habitat', 'country'], { habitat: [field('Habitat')], country: [field('Country')] }),
      model(['habitat'], { habitat: [field('Habitat', { required: true })] }),
    ]);
    expect(fields.map(f => [f.term, f.required, f.inProjects])).toEqual([
      ['habitat', true, 2],
      ['country', false, 1],
    ]);
  });

  it('takes the fields of every section when a model is split into tabs', () => {
    const tabbed: MadocCaptureModelDto = {
      structure: {
        id: 's',
        label: 'Review project 3',
        type: 'choice',
        profile: ['tabs'],
        items: [
          { id: 'a', label: 'Collection', type: 'model', fields: ['dateFrom'] },
          { id: 'b', label: 'Location', type: 'model', fields: ['country'] },
        ],
      },
      document: { id: 'd', type: 'entity', properties: { dateFrom: [field('From')], country: [field('Country')] } },
    };
    expect(collectLayoutFields([tabbed]).map(f => f.term)).toEqual(['dateFrom', 'country']);
  });
});

describe('formNamesBySlug', () => {
  const templateModels = [
    { id: 'model-a', label: 'Herbarium template' },
    { id: 'model-b', label: 'Herbarium template' },
    { id: 'model-c', label: 'Photo archive' },
  ];

  it('gives each project the label of its own model, and leaves out unknown models', () => {
    const projects = [project(1, 'model-a'), project(2, 'model-b'), project(3, 'model-c'), project(4, 'unknown')];
    expect(formNamesBySlug(projects, templateModels)).toEqual({ p1: 'Herbarium template', p2: 'Herbarium template', p3: 'Photo archive' });
  });
});

describe('slugsWithFormNames', () => {
  const labels = { p1: 'Herbarium template', p2: 'Herbarium template', p3: 'Photo archive' };

  it('finds every project that shares a label, so a copy of a template is included', () => {
    expect(slugsWithFormNames(labels, ['Herbarium template'])).toEqual(['p1', 'p2']);
  });

  it('finds nothing for no labels or a label no project has', () => {
    expect(slugsWithFormNames(labels, [])).toEqual([]);
    expect(slugsWithFormNames(labels, ['Renamed model'])).toEqual([]);
  });
});

describe('institutionIdsBySlug', () => {
  it('links each project to the institution of its label and skips labels without one', () => {
    const labels = { p1: 'Herbarium template', p2: 'Photo archive', p3: 'Unlinked' };
    const links = [
      { formName: 'Herbarium template', institutionId: 5, manualId: null },
      { formName: 'Photo archive', institutionId: null, manualId: 2 },
    ];
    expect(institutionIdsBySlug(labels, links)).toEqual({ p1: 5 });
  });
});
