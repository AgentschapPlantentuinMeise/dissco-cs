import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CaptureModel, ModelFields, NestedModelFields, StructureNode } from '../../../capture-model/types/capture-model';
import { AnnotationDocument } from '../../../capture-model/types/document';
import { BaseField } from '../../../capture-model/types/field-types';
import { fieldRegistry } from './fields/registry';
import { DocumentPath, pathsEqual } from './document';

export interface CaptureModelFormProps {
  model: CaptureModel;
  document: AnnotationDocument;
  onChange: (path: DocumentPath, value: unknown) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  saving?: boolean;
  /** Brief success message shown next to the save/submit buttons after a successful save. */
  confirmation?: string | null;
  /** Fires whenever the resolved 'model' node changes (immediately if structure has no choice step) — the caller needs this node's `fields`/`id` to submit a revision. */
  onActiveStructureChange?: (node: StructureNode & { type: 'model' }) => void;
  /** Path of the field currently being drawn on the image, if any — drives the "draw"/"cancel" control on that field's row. */
  drawingPath?: DocumentPath | null;
  /** User clicked "Teken op het beeld" for a field that has a selector configured. */
  onRequestDraw?: (path: DocumentPath) => void;
  /** User cancelled the in-progress draw. */
  onCancelDraw?: () => void;
  /** User cleared a previously drawn region. */
  onClearSelector?: (path: DocumentPath) => void;
  /** Toont het formulier als niet-bewerkbaar met een banner. */
  readOnly?: boolean;
  /** Banner-tekst die bovenaan het formulier verschijnt als readOnly true is. */
  readOnlyBanner?: string;
}

interface SelectorControls {
  drawingPath?: DocumentPath | null;
  onRequestDraw?: (path: DocumentPath) => void;
  onCancelDraw?: () => void;
  onClearSelector?: (path: DocumentPath) => void;
}

function SelectorControl({ path, hasRegion, isDrawing, controls }: {
  path: DocumentPath;
  hasRegion: boolean;
  isDrawing: boolean;
  controls: SelectorControls;
}) {
  if (isDrawing) {
    return (
      <div className="mt-1 flex items-center gap-2 text-[0.8rem] text-[var(--cs-primary)]">
        <span>Sleep op de afbeelding om een gebied te markeren...</span>
        <button type="button" className="text-gray-500 underline" onClick={() => controls.onCancelDraw?.()}>
          Annuleren
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-2 text-[0.8rem]">
      {hasRegion && <span className="text-[var(--cs-primary)]">✓ Gebied gemarkeerd</span>}
      <button
        type="button"
        className="text-[var(--cs-primary)] underline"
        onClick={() => controls.onRequestDraw?.(path)}
      >
        {hasRegion ? 'Opnieuw tekenen' : 'Teken op het beeld'}
      </button>
      {hasRegion && (
        <button type="button" className="text-gray-500 underline" onClick={() => controls.onClearSelector?.(path)}>
          Wissen
        </button>
      )}
    </div>
  );
}

function isEntityList(entry: Array<BaseField> | Array<AnnotationDocument>): entry is Array<AnnotationDocument> {
  return entry.length > 0 && (entry[0] as AnnotationDocument).type === 'entity';
}

function isEntityEmpty(entity: AnnotationDocument): boolean {
  return Object.values(entity.properties).every(list =>
    list.every(entry =>
      (entry as AnnotationDocument).type === 'entity' ? isEntityEmpty(entry as AnnotationDocument) : !(entry as BaseField).value
    )
  );
}

// Mirrors madoc-ts's useResolvedDependant: a field/entity with `dependent: '<term>'` only shows
// once the sibling property named `<term>` (at the same document level) has a value.
function isDependentSatisfied(dependent: string | undefined, document: AnnotationDocument): boolean {
  if (!dependent) return true;

  const dependentEntry = document.properties[dependent]?.[0];
  if (!dependentEntry) return true;

  if ((dependentEntry as AnnotationDocument).type === 'entity') {
    return !isEntityEmpty(dependentEntry as AnnotationDocument);
  }
  const field = dependentEntry as BaseField;
  return !(!field.value || field.value === '') || !!field.selector?.state;
}

// The admin model-editor's "required" checkbox saves its checked state as the array ['on'],
// not a boolean — confirmed by inspecting a real model's logged JSON.
function isRequired(required: boolean | string[] | undefined): boolean {
  return Array.isArray(required) ? required.length > 0 : !!required;
}

function isFieldEmpty(field: BaseField): boolean {
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
function hasVisibleRequiredField(fields: ModelFields, document: AnnotationDocument): boolean {
  return fields.some(entry => {
    const isNested = Array.isArray(entry);
    const term = isNested ? (entry as NestedModelFields)[0] : (entry as string);
    const list = document.properties[term] ?? [];

    if (isNested) {
      const [, nestedFields] = entry as NestedModelFields;
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
function collectMissingRequiredLabels(fields: ModelFields, document: AnnotationDocument): string[] {
  const labels: string[] = [];
  for (const entry of fields) {
    const isNested = Array.isArray(entry);
    const term = isNested ? (entry as NestedModelFields)[0] : (entry as string);
    const list = document.properties[term] ?? [];

    if (isNested) {
      const [, nestedFields] = entry as NestedModelFields;
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
function resolveSingleChoice(node: StructureNode): StructureNode {
  while (node.type === 'choice' && node.items.length === 1) {
    node = node.items[0];
  }
  return node;
}

function EntityFieldset({
  label,
  required,
  nestedFields,
  entities,
  pathPrefix,
  term,
  onChange,
  selectorControls,
}: {
  label: string;
  required: boolean;
  nestedFields: ModelFields;
  entities: AnnotationDocument[];
  pathPrefix: DocumentPath;
  term: string;
  onChange: CaptureModelFormProps['onChange'];
  selectorControls: SelectorControls;
}) {
  const [open, setOpen] = useState(true);

  return (
    <fieldset className="border border-gray-200 rounded mb-4">
      <legend className="w-full px-1">
        <button
          type="button"
          className="w-full flex items-center justify-between px-2 py-2 text-[0.85rem] font-semibold text-gray-700 cursor-pointer"
          onClick={() => setOpen(o => !o)}
        >
          <span>
            {label}
            {required && <span className="text-red-500"> *</span>}
          </span>
          <span className="text-gray-400">{open ? '▾' : '▸'}</span>
        </button>
      </legend>
      {open && (
        <div className="px-3 pb-3">
          {entities.map((entity, idx) => (
            <div key={entity.id ?? idx} className="mb-2">
              {renderFields(nestedFields, entity, [...pathPrefix, term, idx], onChange, selectorControls)}
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function renderFields(
  fields: ModelFields,
  document: AnnotationDocument,
  pathPrefix: DocumentPath,
  onChange: CaptureModelFormProps['onChange'],
  selectorControls: SelectorControls
) {
  return fields.map(entry => {
    const isNested = Array.isArray(entry);
    const term = isNested ? (entry as NestedModelFields)[0] : (entry as string);
    const list = document.properties[term] ?? [];

    if (isNested) {
      const [, nestedFields] = entry as NestedModelFields;
      const entities = isEntityList(list) ? list : [];
      if (!isDependentSatisfied(entities[0]?.dependent, document)) return null;
      return (
        <EntityFieldset
          key={term}
          label={entities[0]?.label ?? term}
          required={isRequired(entities[0]?.required)}
          nestedFields={nestedFields}
          entities={entities}
          pathPrefix={pathPrefix}
          term={term}
          onChange={onChange}
          selectorControls={selectorControls}
        />
      );
    }

    const fieldList = !isEntityList(list) ? list : [];
    return fieldList.map((field, idx) => {
      if (!isDependentSatisfied(field.dependent, document)) return null;
      const FieldComponent = fieldRegistry[field.type];
      const path = [...pathPrefix, term, idx];
      return (
        <div key={field.id ?? `${term}-${idx}`} className="mb-4">
          <label className="block text-[0.85rem] font-medium text-gray-700 mb-1">
            {field.label}
            {isRequired(field.required) && <span className="text-red-500"> *</span>}
          </label>
          {FieldComponent ? (
            <FieldComponent field={field} path={path} onChange={onChange} />
          ) : (
            <p className="text-[0.8rem] text-gray-400">Veldtype "{field.type}" wordt nog niet ondersteund.</p>
          )}
          {field.selector && (
            <SelectorControl
              path={path}
              hasRegion={!!field.selector.state}
              isDrawing={pathsEqual(selectorControls.drawingPath, path)}
              controls={selectorControls}
            />
          )}
        </div>
      );
    });
  });
}

export function CaptureModelForm({
  model,
  document,
  onChange,
  onSaveDraft,
  onSubmit,
  saving,
  confirmation,
  onActiveStructureChange,
  drawingPath,
  onRequestDraw,
  onCancelDraw,
  onClearSelector,
  readOnly,
  readOnlyBanner,
}: CaptureModelFormProps) {
  const { t } = useTranslation('dissco-cs');
  const selectorControls: SelectorControls = { drawingPath, onRequestDraw, onCancelDraw, onClearSelector };
  // A choice node just picks between alternative 'model' nodes — this stack lets the user
  // step back through nested choices instead of re-rendering a separate "choice screen".
  const [stack, setStack] = useState<StructureNode[]>([resolveSingleChoice(model.structure)]);

  useEffect(() => {
    setStack([resolveSingleChoice(model.structure)]);
  }, [model]);

  const current = stack[stack.length - 1];
  const [missingRequired, setMissingRequired] = useState<string[]>([]);

  useEffect(() => {
    if (current.type === 'model') onActiveStructureChange?.(current);
  }, [current, onActiveStructureChange]);

  const handleSubmit = () => {
    if (current.type !== 'model') return;
    const missing = collectMissingRequiredLabels(current.fields, document);
    setMissingRequired(missing);
    if (missing.length > 0) return;
    onSubmit();
  };

  if (current.type === 'choice') {
    return (
      <div className="flex flex-col h-full">
        {readOnly && readOnlyBanner && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-[0.88rem] font-medium flex-shrink-0">
            {readOnlyBanner}
          </div>
        )}
        <div className={`p-5 ${readOnly ? 'pointer-events-none opacity-60 select-none' : ''}`}>
          {stack.length > 1 && (
            <button className="text-[0.85rem] text-[var(--cs-primary)] mb-3" onClick={() => setStack(s => s.slice(0, -1))}>
              ← Terug
            </button>
          )}
          <p className="text-[0.95rem] font-medium text-gray-800 mb-3">{current.label}</p>
          <div className="flex flex-col gap-2">
            {current.items.map(item => (
              <button
                key={item.id}
                className="px-4 py-2 bg-white border border-[var(--cs-primary)] text-[var(--cs-primary)] rounded text-[0.9rem] text-left hover:bg-[var(--cs-primary)] hover:text-white"
                onClick={() => setStack(s => [...s, resolveSingleChoice(item)])}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {readOnly && readOnlyBanner && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-[0.88rem] font-medium flex-shrink-0">
          {readOnlyBanner}
        </div>
      )}
      {stack.length > 1 && (
        <div className="px-5 pt-3">
          <button className="text-[0.85rem] text-[var(--cs-primary)]" onClick={() => setStack(s => s.slice(0, -1))}>
            ← Andere keuze
          </button>
        </div>
      )}
      <div className={`flex-1 min-h-0 px-5 py-5 pb-2 overflow-y-auto ${readOnly ? 'pointer-events-none opacity-60 select-none' : ''}`}>
        {hasVisibleRequiredField(current.fields, document) && (
          <p className="text-[0.78rem] text-gray-500 mb-3">
            <span className="text-red-500">*</span> verplicht veld
          </p>
        )}
        {renderFields(current.fields, document, [], onChange, selectorControls)}
      </div>
      {!readOnly && (
        <div className="px-5 py-3 border-t border-gray-300 bg-gray-50">
          {missingRequired.length > 0 && (
            <p className="text-[0.8rem] text-red-600 mb-2">
              Vul eerst de verplichte velden in: {missingRequired.join(', ')}
            </p>
          )}
          <div className="flex gap-2 items-center">
            <button
              className="px-4 py-2 bg-white border border-[var(--cs-primary)] text-[var(--cs-primary)] rounded text-[0.9rem] disabled:opacity-50"
              onClick={onSaveDraft}
              disabled={saving}
            >
              {t('task_save_draft')}
            </button>
            <button
              className="px-4 py-2 bg-[var(--cs-primary)] text-white rounded text-[0.9rem] disabled:opacity-50"
              onClick={handleSubmit}
              disabled={saving}
            >
              {t('task_submit')}
            </button>
            {confirmation && (
              <span className="text-[0.9rem] text-[var(--cs-primary)] font-medium">
                <span aria-hidden="true">✓</span> {confirmation}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
