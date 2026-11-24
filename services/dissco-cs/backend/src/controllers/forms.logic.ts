import {
  FormDto,
  FormLayoutFieldDto,
  FormProjectDto,
  MadocAnnotationDocumentDto,
  MadocBaseFieldDto,
  MadocCaptureModelDto,
  MadocProjectDto,
  MadocStructureNodeDto,
  isRequired,
  madocProjectVisibility,
} from '@dissco-cs/shared-types';

// A form is known by its name: the label of a project's own model (capture_model_id). Everything
// stored for a form (layout, institution, manual) applies to every project with that form name.

type ModelLabel = { id: string; label: string };

/**
 * An archived project no longer counts for a form: it does not block removing the layout, and its
 * fields are not required in it.
 */
export function isActiveProject(project: MadocProjectDto): boolean {
  return madocProjectVisibility(project.status) !== 'archived';
}

/**
 * Project slug -> form name. Projects whose model is not in the list are left out.
 */
export function formNamesBySlug(projects: MadocProjectDto[], models: ModelLabel[]): Record<string, string> {
  const labelById = new Map(models.map(model => [model.id, model.label]));
  const names: Record<string, string> = {};
  for (const project of projects) {
    const name = labelById.get(project.capture_model_id);
    if (name !== undefined) names[project.slug] = name;
  }
  return names;
}

/** The slugs of the projects whose form name is one of these. */
export function slugsWithFormNames(namesBySlug: Record<string, string>, formNames: string[]): string[] {
  const wanted = new Set(formNames);
  return Object.keys(namesBySlug).filter(slug => wanted.has(namesBySlug[slug]));
}

/** Project slug -> institution id, for every project whose form has an institution. */
export function institutionIdsBySlug(
  namesBySlug: Record<string, string>,
  forms: { formName: string; institutionId: number | null }[]
): Record<string, number> {
  const institutionByName = new Map(forms.flatMap(form => (form.institutionId === null ? [] : [[form.formName, form.institutionId] as const])));
  const result: Record<string, number> = {};
  for (const [slug, name] of Object.entries(namesBySlug)) {
    const institutionId = institutionByName.get(name);
    if (institutionId !== undefined) result[slug] = institutionId;
  }
  return result;
}

export function projectsWithFormName(projects: MadocProjectDto[], models: ModelLabel[], formName: string): MadocProjectDto[] {
  const namesBySlug = formNamesBySlug(projects, models);
  return projects.filter(project => namesBySlug[project.slug] === formName);
}

function toProject(project: MadocProjectDto): FormProjectDto {
  return { id: project.id, slug: project.slug, label: project.label, status: project.status };
}

/**
 * Every form name in use, with its projects and what is stored for it. A stored form whose name no
 * project has any more (the model was renamed in Madoc) is listed too, with no projects, so it can
 * be found and emptied. A template project that no longer has the form (deleted in Madoc, or its
 * model renamed) is dropped, so the admin never gets a link to the wrong project. A stored form
 * with nothing set counts as not stored: deleting an institution or manual empties its column in
 * the database (ON DELETE SET NULL), which can leave such a row behind.
 */
export function groupProjectsByFormName(projects: MadocProjectDto[], models: ModelLabel[], allStored: Omit<FormDto, 'projects'>[]): FormDto[] {
  const stored = allStored.filter(
    form => form.templateProjectId !== null || form.institutionId !== null || form.manualId !== null || form.layout !== null
  );
  const namesBySlug = formNamesBySlug(projects, models);
  const projectsByName = new Map<string, FormProjectDto[]>();
  for (const project of projects) {
    const name = namesBySlug[project.slug];
    if (name === undefined) continue;
    projectsByName.set(name, [...(projectsByName.get(name) ?? []), toProject(project)]);
  }
  for (const form of stored) {
    if (!projectsByName.has(form.formName)) projectsByName.set(form.formName, []);
  }

  const storedByName = new Map(stored.map(form => [form.formName, form]));
  return [...projectsByName.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([formName, formProjects]) => {
      const form = storedByName.get(formName);
      const templateProjectId = form?.templateProjectId ?? null;
      return {
        formName,
        templateProjectId: formProjects.some(project => project.id === templateProjectId) ? templateProjectId : null,
        institutionId: form?.institutionId ?? null,
        manualId: form?.manualId ?? null,
        layout: form?.layout ?? null,
        projects: formProjects,
      };
    });
}

// The terms a model shows on the form, in the order of its structure. A structure is a tree of
// choices (Madoc's "pick one of these forms", or sections when the choice is shown as tabs) with
// models as leaves; every model lists its terms, and a nested entry [term, fields] is a group of
// fields (an entity) that is placed as one block.
function structureTerms(node: MadocStructureNodeDto): string[] {
  if (node.type === 'choice') return node.items.flatMap(structureTerms);
  return node.fields.map(entry => (Array.isArray(entry) ? entry[0] : entry));
}

/**
 * The fields of one or more capture models, merged by term in the order they first appear. A field
 * counts as required when it is required in any of the models.
 */
export function collectLayoutFields(models: MadocCaptureModelDto[]): FormLayoutFieldDto[] {
  const fields = new Map<string, FormLayoutFieldDto>();

  for (const model of models) {
    for (const term of new Set(structureTerms(model.structure))) {
      const entry = model.document.properties[term]?.[0];
      if (!entry) continue;

      const isEntity = (entry as MadocAnnotationDocumentDto).type === 'entity';
      const required = isRequired(entry.required);
      const known = fields.get(term);
      if (known) {
        known.inProjects += 1;
        known.required ||= required;
        continue;
      }
      fields.set(term, {
        term,
        label: (isEntity ? (entry as MadocAnnotationDocumentDto).label : (entry as MadocBaseFieldDto).label) || term,
        type: isEntity ? 'entity' : (entry as MadocBaseFieldDto).type,
        required,
        isEntity,
        inProjects: 1,
      });
    }
  }

  return [...fields.values()];
}
