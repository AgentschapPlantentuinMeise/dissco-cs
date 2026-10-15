import { MadocAnnotationDocumentDto, MadocBaseFieldDto, MadocModelFields, MadocNestedModelFields, MadocStructureNodeDto } from '@dissco-cs/shared-types';

// Rules of a capture model: which fields are visible, required and filled in. They decide whether
// the required legend shows and whether "Indienen" is allowed.

export function isEntityList(entry: Array<MadocBaseFieldDto> | Array<MadocAnnotationDocumentDto>): entry is Array<MadocAnnotationDocumentDto> {
  return entry.length > 0 && (entry[0] as MadocAnnotationDocumentDto).type === 'entity';
}

export function isEntityEmpty(entity: MadocAnnotationDocumentDto): boolean {
  return Object.values(entity.properties).every(list =>
    list.every(entry =>
      (entry as MadocAnnotationDocumentDto).type === 'entity' ? isEntityEmpty(entry as MadocAnnotationDocumentDto) : !(entry as MadocBaseFieldDto).value
    )
  );
}

// Mirrors madoc-ts's useResolvedDependant: a field/entity with `dependent: '<term>'` only shows
// once the sibling property named `<term>` (at the same document level) has a value.
export function isDependentSatisfied(dependent: string | undefined, document: MadocAnnotationDocumentDto): boolean {
  if (!dependent) return true;

  const dependentEntry = document.properties[dependent]?.[0];
  if (!dependentEntry) return true;

  if ((dependentEntry as MadocAnnotationDocumentDto).type === 'entity') {
    return !isEntityEmpty(dependentEntry as MadocAnnotationDocumentDto);
  }
  const field = dependentEntry as MadocBaseFieldDto;
  return !(!field.value || field.value === '') || !!field.selector?.state;
}

// The admin model-editor's "required" checkbox saves its checked state as the array ['on'],
// not a boolean — confirmed by inspecting a real model's logged JSON.
export function isRequired(required: boolean | string[] | undefined): boolean {
  return Array.isArray(required) ? required.length > 0 : !!required;
}

export function isFieldEmpty(field: MadocBaseFieldDto): boolean {
  if (field.selector?.state) return false;
  const { value } = field;
  if (!value || value === '') return true;
  // checkbox-list-field's value is {[option]: boolean} rather than a primitive — it's only
  // "filled" once at least one option is actually checked, not just because the object exists.
  if (typeof value === 'object' && !Array.isArray(value)) {
    return !Object.values(value).some(Boolean);
  }
  return false;
}

// Walks the same fields/document the renderer walks (skipping fields hidden by a
// dependent-on condition) to find whether any visible field/entity is required — used to
// decide whether the "* verplicht veld" legend is shown at all.
export function hasVisibleRequiredField(fields: MadocModelFields, document: MadocAnnotationDocumentDto): boolean {
  return fields.some(entry => {
    const isNested = Array.isArray(entry);
    const term = isNested ? (entry as MadocNestedModelFields)[0] : (entry as string);
    const list = document.properties[term] ?? [];

    if (isNested) {
      const [, nestedFields] = entry as MadocNestedModelFields;
      const entities = isEntityList(list) ? list : [];
      if (!isDependentSatisfied(entities[0]?.dependent, document)) return false;
      return isRequired(entities[0]?.required) || entities.some(entity => hasVisibleRequiredField(nestedFields, entity));
    }

    const fieldList = !isEntityList(list) ? list : [];
    return fieldList.some(field => isDependentSatisfied(field.dependent, document) && isRequired(field.required));
  });
}

// Same walk, but collects the labels of required fields/entities that are still empty —
// used to block "Indienen" until they're filled in.
export function collectMissingRequiredLabels(fields: MadocModelFields, document: MadocAnnotationDocumentDto): string[] {
  const labels: string[] = [];
  for (const entry of fields) {
    const isNested = Array.isArray(entry);
    const term = isNested ? (entry as MadocNestedModelFields)[0] : (entry as string);
    const list = document.properties[term] ?? [];

    if (isNested) {
      const [, nestedFields] = entry as MadocNestedModelFields;
      const entities = isEntityList(list) ? list : [];
      if (!isDependentSatisfied(entities[0]?.dependent, document)) continue;
      if (isRequired(entities[0]?.required) && entities.every(isEntityEmpty)) {
        labels.push(entities[0]?.label ?? term);
      }
      entities.forEach(entity => labels.push(...collectMissingRequiredLabels(nestedFields, entity)));
      continue;
    }

    const fieldList = !isEntityList(list) ? list : [];
    fieldList.forEach(field => {
      if (isDependentSatisfied(field.dependent, document) && isRequired(field.required) && isFieldEmpty(field)) {
        labels.push(field.label);
      }
    });
  }
  return labels;
}

// Every capture model's top-level structure is technically a 'choice' (Madoc's model editor always
// wraps it that way), even when there's only one "Default" model and no real branching — the admin
// UI hides this single-item case from editors, so we skip it here too instead of showing the user
// a "pick one" screen with exactly one button.
export function resolveSingleChoice(node: MadocStructureNodeDto): MadocStructureNodeDto {
  while (node.type === 'choice' && node.items.length === 1) {
    node = node.items[0];
  }
  return node;
}

// A choice's items are only rendered as sections when its own `profile` opts in via 'tabs' — the
// same profile Madoc's own model editor exposes (StructureMetadataEditor's "tabs" toggle), reused
// here as the "these are not real alternatives, show them together" signal instead of introducing
// a separate custom flag. Each item is unwrapped through resolveSingleChoice first so an
// accidental single-item nested choice still resolves to its model instead of being skipped.
export function resolveSectionModels(node: MadocStructureNodeDto): Array<MadocStructureNodeDto & { type: 'model' }> | null {
  if (node.type !== 'choice' || !node.profile?.includes('tabs')) return null;
  return node.items
    .map(resolveSingleChoice)
    .filter((item): item is MadocStructureNodeDto & { type: 'model' } => item.type === 'model');
}
