import { CaptureModel } from '../../../capture-model/types/capture-model';
import { AnnotationDocument } from '../../../capture-model/types/document';
import { BaseField } from '../../../capture-model/types/field-types';
import { BoxSelectorState } from '../../../capture-model/types/selector-types';

/** A path into the document tree: alternating property name and instance index, e.g. ['author', 0, 'name', 0]. */
export type DocumentPath = Array<string | number>;

function isField(entry: BaseField | AnnotationDocument): entry is BaseField {
  return (entry as AnnotationDocument).type !== 'entity';
}

/** Starting point for a new revision: a deep clone of the model's own document, so editing it never mutates the model. */
export function cloneModelDocument(model: CaptureModel): AnnotationDocument {
  return JSON.parse(JSON.stringify(model.document));
}

/** Clears every field's value/selector state and revision tags on a cloned document tree, in place. */
function blankEntity(entity: AnnotationDocument): void {
  for (const list of Object.values(entity.properties)) {
    for (const item of list) {
      if (isField(item)) {
        item.value = undefined;
        delete item.revision;
        if (item.selector) {
          item.selector.state = null;
          item.selector.revisionId = null;
          item.selector.revises = null;
        }
      } else {
        blankEntity(item);
      }
    }
  }
}

/**
 * Same shape as the model's document (same fields/entities), but with every value and selector
 * state cleared — used for a genuinely new claim, since the model's own `document` may still carry
 * values from a previous, possibly abandoned, contribution (capture models are shared per manifest,
 * not per user — see docs/MANIFEST-CLAIMS.md).
 */
export function createBlankDocument(model: CaptureModel): AnnotationDocument {
  const clone: AnnotationDocument = JSON.parse(JSON.stringify(model.document));
  blankEntity(clone);
  return clone;
}

/** Shared by setFieldValue/setFieldSelector: walks to the field at `path` and replaces it with `updateField`'s result. */
function updateFieldAtPath(
  document: AnnotationDocument,
  path: DocumentPath,
  updateField: (field: BaseField) => BaseField
): AnnotationDocument {
  if (path.length < 2) {
    throw new Error(`Invalid document path: ${JSON.stringify(path)}`);
  }

  const [term, indexRaw, ...rest] = path;
  const index = Number(indexRaw);
  const list = document.properties[term] ?? [];
  const entry = list[index];

  if (!entry) {
    throw new Error(`No entry at ${term}[${index}]`);
  }

  let updatedEntry: BaseField | AnnotationDocument;
  if (rest.length === 0) {
    if (!isField(entry)) throw new Error(`Path ${JSON.stringify(path)} resolves to an entity, not a field`);
    updatedEntry = updateField(entry);
  } else {
    if (isField(entry)) throw new Error(`Path ${JSON.stringify(path)} expects a nested entity`);
    updatedEntry = updateFieldAtPath(entry, rest, updateField);
  }

  const updatedList = list.slice();
  updatedList[index] = updatedEntry as any;

  return {
    ...document,
    properties: {
      ...document.properties,
      [term]: updatedList,
    },
  };
}

/**
 * Returns a new document with the value at `path` replaced — the rest of the tree is left untouched.
 * `revisionId` must be the same id used as `revision.id` when submitting, so the server's
 * merge logic (extract-valid-revision-changes.ts) recognises this field as part of that revision.
 */
export function setFieldValue(document: AnnotationDocument, path: DocumentPath, value: unknown, revisionId: string): AnnotationDocument {
  return updateFieldAtPath(document, path, field => ({ ...field, value, revision: revisionId }));
}

/** Returns a new document with the region drawn on the image stored on the field's selector at `path`. */
export function setFieldSelector(document: AnnotationDocument, path: DocumentPath, state: BoxSelectorState, revisionId: string): AnnotationDocument {
  return updateFieldAtPath(document, path, field => {
    if (!field.selector) throw new Error(`Field at ${JSON.stringify(path)} has no selector configured`);
    return { ...field, selector: { ...field.selector, state }, revision: revisionId };
  });
}

/** Reads the current value at `path`, or undefined if it doesn't resolve to a field. */
export function getFieldValue(document: AnnotationDocument, path: DocumentPath): unknown {
  const [term, indexRaw, ...rest] = path;
  const index = Number(indexRaw);
  const entry = document.properties[term]?.[index];
  if (!entry) return undefined;
  if (rest.length === 0) return isField(entry) ? entry.value : undefined;
  return isField(entry) ? undefined : getFieldValue(entry, rest);
}

export interface SelectorEntry {
  path: DocumentPath;
  id: string;
  state: BoxSelectorState;
}

/** Walks the whole document tree (regardless of dependent/visibility rules) collecting every field that has a region drawn — used to render saved regions as overlays on the image. */
export function collectSelectorStates(document: AnnotationDocument, pathPrefix: DocumentPath = []): SelectorEntry[] {
  const results: SelectorEntry[] = [];
  for (const [term, list] of Object.entries(document.properties)) {
    list.forEach((entry, index) => {
      const path = [...pathPrefix, term, index];
      if (isField(entry)) {
        if (entry.selector?.state) {
          results.push({ path, id: entry.id, state: entry.selector.state as BoxSelectorState });
        }
      } else {
        results.push(...collectSelectorStates(entry, path));
      }
    });
  }
  return results;
}

/** Path equality by value, since paths are recreated on every render. */
export function pathsEqual(a: DocumentPath | null | undefined, b: DocumentPath | null | undefined): boolean {
  if (!a || !b) return a === b;
  return a.length === b.length && a.every((part, i) => part === b[i]);
}
