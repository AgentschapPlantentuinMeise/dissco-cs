import { MadocAnnotationDocumentDto, MadocModelFields, MadocNestedModelFields, MadocStructureNodeDto } from '@dissco-cs/shared-types';
import { DocumentPath } from '../../utility/annotation-document';
import { isDependentSatisfied, isEntityList, resolveSectionModels } from './form/capture-model-rules';

// The help a model author wrote in Madoc's model editor: "Instructions" on a model, "Description"
// on a field or a group of fields (entity). The annotate page shows it in the Uitleg panel.

type ModelNode = MadocStructureNodeDto & { type: 'model' };

export interface FieldHelpItem {
  key: string;
  label: string;
  description: string;
}

export interface FieldHelpGroup {
  key: string;
  // null for the fields directly in a single model: the panel shows them without a heading.
  label: string | null;
  intro: string | null;
  items: FieldHelpItem[];
}

export interface FieldHelp {
  instructions: string[];
  groups: FieldHelpGroup[];
}

/**
 * The key that links a field's question mark to its help: the terms of its document path without
 * the list positions, so every copy of a repeated field or group points to the same help.
 * @param path the field's document path, e.g. ['identification', 0, 'name', 0]
 * Returns: e.g. 'identification.name'.
 */
export function fieldHelpKey(path: DocumentPath): string {
  return path.filter(part => typeof part === 'string').join('.');
}

/**
 * Finds a node of a capture model's structure by its id.
 * @param node the root (or any node) of the structure
 * @param id the id to look for, e.g. the active structure's id
 * Returns: the node, or null when it is not in this tree.
 */
export function findStructureNode(node: MadocStructureNodeDto, id: string): MadocStructureNodeDto | null {
  if (node.id === id) return node;
  if (node.type !== 'choice') return null;
  for (const item of node.items) {
    const found = findStructureNode(item, id);
    if (found) return found;
  }
  return null;
}

/**
 * The models whose help applies to what the form shows: the one model, or every section of a
 * choice shown as sections ('tabs').
 * @param root the capture model's structure
 * @param activeId the id of the structure the form reports as active
 * Returns: the models, empty when the id is unknown.
 */
export function helpModelsFor(root: MadocStructureNodeDto, activeId: string): ModelNode[] {
  const node = findStructureNode(root, activeId);
  if (!node) return [];
  return node.type === 'model' ? [node] : resolveSectionModels(node) ?? [];
}

function text(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// Walks the fields like the form does (a field hidden by its dependent-on condition has no help
// either). A repeated field or group is read once, from its first copy.
function walk(fields: MadocModelFields, document: MadocAnnotationDocumentDto, path: string[], group: FieldHelpGroup, groups: FieldHelpGroup[]) {
  for (const entry of fields) {
    const isNested = Array.isArray(entry);
    const term = isNested ? (entry as MadocNestedModelFields)[0] : (entry as string);
    const list = document.properties[term] ?? [];
    const key = [...path, term].join('.');

    if (isNested) {
      const entity = isEntityList(list) ? list[0] : undefined;
      if (!entity || !isDependentSatisfied(entity.dependent, document)) continue;
      const nested: FieldHelpGroup = { key, label: entity.label ?? term, intro: text(entity.description), items: [] };
      const nestedGroups: FieldHelpGroup[] = [];
      walk((entry as MadocNestedModelFields)[1], entity, [...path, term], nested, nestedGroups);
      groups.push(nested, ...nestedGroups);
      continue;
    }

    const field = !isEntityList(list) ? list[0] : undefined;
    const description = text(field?.description);
    if (field && description && isDependentSatisfied(field.dependent, document)) {
      group.items.push({ key, label: field.label, description });
    }
  }
}

/**
 * Collects the help of the models the form shows, in the order of the form.
 * @param models the models (see helpModelsFor)
 * @param document the annotation document the form edits
 * Returns: the models' instructions, and per group the fields that have a description; groups
 *   without any help are left out.
 */
export function collectFieldHelp(models: ModelNode[], document: MadocAnnotationDocumentDto): FieldHelp {
  const instructions = models.map(model => text(model.instructions)).filter((value): value is string => value !== null);
  const groups: FieldHelpGroup[] = [];
  for (const model of models) {
    const own: FieldHelpGroup = { key: model.id, label: models.length > 1 ? model.label : null, intro: null, items: [] };
    const nested: FieldHelpGroup[] = [];
    walk(model.fields, document, [], own, nested);
    groups.push(own, ...nested);
  }
  return { instructions, groups: groups.filter(group => group.intro !== null || group.items.length > 0) };
}
