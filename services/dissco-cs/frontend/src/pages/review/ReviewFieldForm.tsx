import React from 'react';
import { useTranslation } from 'react-i18next';
import { CaptureModel, ModelFields, NestedModelFields, StructureNode } from '../../capture-model/types/capture-model';
import { AnnotationDocument } from '../../capture-model/types/document';
import { BaseField } from '../../capture-model/types/field-types';
import { DocumentPath } from '../annotate/form/document';

export interface ReviewFieldFormProps {
  model: CaptureModel;
  document: AnnotationDocument;
  onChange: (path: DocumentPath, value: unknown) => void;
}

function isEntityList(entry: Array<BaseField> | Array<AnnotationDocument>): entry is Array<AnnotationDocument> {
  return entry.length > 0 && (entry[0] as AnnotationDocument).type === 'entity';
}

// Review-context heeft geen interactieve keuzeschermen nodig -- een reviewer wil zien wat er
// effectief werd ingediend, niet zelf een model-variant kiezen. Bij een echte keuze (>1 item)
// tonen we gewoon de eerste tak.
function resolveDisplayStructure(node: StructureNode): StructureNode {
  while (node.type === 'choice' && node.items.length > 0) {
    node = node.items[0];
  }
  return node;
}

function fieldToText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

// Niet-string velden (checkbox/dropdown/...) proberen we als JSON terug te lezen zodat een
// ongewijzigd veld zijn oorspronkelijke vorm behoudt; lukt dat niet, dan wordt het gewoon tekst --
// de reviewer kent zelf het verwachte formaat.
function textToFieldValue(text: string, original: unknown): unknown {
  if (original === undefined || original === null || typeof original === 'string') return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function FieldRow({ field, path, onChange }: { field: BaseField; path: DocumentPath; onChange: ReviewFieldFormProps['onChange'] }) {
  const { t } = useTranslation('dissco-cs');
  return (
    <div className="mb-3">
      <label className="block text-[0.78rem] font-semibold text-gray-700 mb-1">{field.label}</label>
      <input
        type="text"
        value={fieldToText(field.value)}
        placeholder={t('review_detail_field_empty')}
        onChange={e => onChange(path, textToFieldValue(e.target.value, field.value))}
        className="w-full px-[10px] py-2 rounded-md border border-gray-300 text-[0.85rem] focus:outline-none focus:ring-2 focus:ring-[var(--cs-accent)] focus:border-[var(--cs-accent)]"
      />
    </div>
  );
}

type Block = { key: string; label: string | null; fields: React.ReactNode[] };

// Grid-layout geeft elk blok een eigen kolom -- een blok met veel velden (bv. een plat formulier
// zonder secties) zou anders als één lange kolom renderen terwijl de andere kolommen leeg
// blijven. Splits zulke blokken op in stukken van 6 velden, elk als eigen kolom; enkel het eerste
// stuk krijgt het sectielabel.
const GRID_CHUNK_SIZE = 6;

function chunkForGrid(blocks: Block[]): Block[] {
  const result: Block[] = [];
  blocks.forEach(block => {
    if (block.fields.length <= GRID_CHUNK_SIZE) {
      result.push(block);
      return;
    }
    for (let i = 0; i < block.fields.length; i += GRID_CHUNK_SIZE) {
      result.push({
        key: `${block.key}__${i}`,
        label: i === 0 ? block.label : null,
        fields: block.fields.slice(i, i + GRID_CHUNK_SIZE),
      });
    }
  });
  return result;
}

function collectBlocks(fields: ModelFields, doc: AnnotationDocument, pathPrefix: DocumentPath, onChange: ReviewFieldFormProps['onChange']): Block[] {
  const blocks: Block[] = [];
  const ungrouped: React.ReactNode[] = [];

  fields.forEach(entry => {
    const isNested = Array.isArray(entry);
    const term = isNested ? (entry as NestedModelFields)[0] : (entry as string);
    const list = doc.properties[term] ?? [];

    if (isNested) {
      const [, nestedFields] = entry as NestedModelFields;
      const entities = isEntityList(list) ? list : [];
      if (entities.length === 0) return;
      blocks.push({
        key: term,
        label: entities[0]?.label ?? term,
        fields: entities.map((entity, idx) => (
          <div key={entity.id ?? idx}>{collectBlocks(nestedFields, entity, [...pathPrefix, term, idx], onChange).map(b => b.fields)}</div>
        )),
      });
      return;
    }

    const fieldList = !isEntityList(list) ? list : [];
    fieldList.forEach((field, idx) => {
      ungrouped.push(<FieldRow key={field.id ?? `${term}-${idx}`} field={field} path={[...pathPrefix, term, idx]} onChange={onChange} />);
    });
  });

  if (ungrouped.length > 0) {
    blocks.unshift({ key: '__ungrouped', label: null, fields: ungrouped });
  }

  return blocks;
}

// Vereenvoudigde vorm van CaptureModelForm, specifiek voor de review-context: elk veldtype
// (datum, checkbox, dropdown, ...) wordt hetzelfde weergegeven -- een label plus één tekstvak --
// zodat een reviewer ingediende data snel kan nalezen en corrigeren zonder per-type widgets.
// Secties staan altijd naast elkaar in 3 vaste kolommen (valt terug naar 1 kolom op smalle
// schermen); bij >3 secties valt de rest gewoon naar een nieuwe rij van 3.
export function ReviewFieldForm({ model, document, onChange }: ReviewFieldFormProps) {
  const resolved = resolveDisplayStructure(model.structure);
  if (resolved.type !== 'model') {
    return null;
  }

  const blocks = collectBlocks(resolved.fields, document, [], onChange);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
      {chunkForGrid(blocks).map(block => (
        <div key={block.key}>
          {block.label && (
            <h3 className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--cs-tertiary)] mb-2.5 pb-1.5 border-b border-gray-200">
              {block.label}
            </h3>
          )}
          {block.fields}
        </div>
      ))}
    </div>
  );
}
