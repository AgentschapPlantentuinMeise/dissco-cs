import React from 'react';
import { useTranslation } from 'react-i18next';
import { MadocCaptureModelDto, MadocModelFields, MadocNestedModelFields, MadocStructureNodeDto, MadocAnnotationDocumentDto, MadocBaseFieldDto } from '@dissco-cs/shared-types';
import { DocumentPath } from '../../utility/annotation-document';

export interface SubmissionFieldsFormProps {
  model: MadocCaptureModelDto;
  document: MadocAnnotationDocumentDto;
  onChange?: (path: DocumentPath, value: unknown) => void;
  /** Shows the fields as plain text instead of editable inputs. */
  readOnly?: boolean;
}

function isEntityList(entry: Array<MadocBaseFieldDto> | Array<MadocAnnotationDocumentDto>): entry is Array<MadocAnnotationDocumentDto> {
  return entry.length > 0 && (entry[0] as MadocAnnotationDocumentDto).type === 'entity';
}

// Shows an already-submitted document (reviewer editing it, or a volunteer viewing their own
// task), so there's no interactive choice screen: whoever looks at it wants to see what was
// actually submitted, not pick a model variant. For a real choice (>1 item) we show the first branch.
function resolveDisplayStructure(node: MadocStructureNodeDto): MadocStructureNodeDto {
  while (node.type === 'choice' && node.items.length > 0) {
    node = node.items[0];
  }
  return node;
}

// Mirrors CaptureModelForm.tsx's resolveSectionModels: a choice opted into 'tabs' via its own
// `profile` isn't a real either/or (see resolveDisplayStructure above) -- it's a set of sections
// that were all filled in together, so the viewer needs to see all of them, not just the first.
function resolveDisplayModels(node: MadocStructureNodeDto): Array<MadocStructureNodeDto & { type: 'model' }> {
  if (node.type === 'choice' && node.profile?.includes('tabs')) {
    return node.items
      .map(resolveDisplayStructure)
      .filter((item): item is MadocStructureNodeDto & { type: 'model' } => item.type === 'model');
  }
  const resolved = resolveDisplayStructure(node);
  return resolved.type === 'model' ? [resolved] : [];
}

function fieldToText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

// A field that is not text (checkbox, dropdown, ...) is read back as JSON, so an unchanged field
// keeps its original shape; if that fails it simply becomes text -- the reviewer knows the format.
function textToFieldValue(text: string, original: unknown): unknown {
  if (original === undefined || original === null || typeof original === 'string') return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function FieldRow({ field, path, onChange, readOnly }: { field: MadocBaseFieldDto; path: DocumentPath; onChange: SubmissionFieldsFormProps['onChange']; readOnly?: boolean }) {
  const { t } = useTranslation('dissco-cs');
  return (
    <div className="mb-3">
      <label className="block text-[0.78rem] font-semibold text-gray-700 mb-1">{field.label}</label>
      <input
        type="text"
        value={fieldToText(field.value)}
        placeholder={t('review_detail_field_empty')}
        readOnly={readOnly}
        onChange={e => onChange?.(path, textToFieldValue(e.target.value, field.value))}
        className={`w-full px-[10px] py-2 rounded-md border border-gray-300 text-[0.85rem] focus:outline-none focus:ring-2 focus:ring-cs-accent focus:border-cs-accent ${readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''}`}
      />
    </div>
  );
}

// `boxed` distinguishes an entity group (a repeatable nested model, always framed so it reads as
// its own record) from a section/ungrouped block (a plain heading, no frame).
type Block = { key: string; label: string | null; fields: React.ReactNode[]; boxed?: boolean };

// The grid gives every block its own column, so a block with many fields (e.g. a flat form without
// sections) would become one long column while the others stay empty. Such blocks are split into
// pieces of 6 fields, each its own column; only the first piece gets the section label.
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

function collectBlocks(fields: MadocModelFields, doc: MadocAnnotationDocumentDto, pathPrefix: DocumentPath, onChange: SubmissionFieldsFormProps['onChange'], readOnly?: boolean): Block[] {
  const blocks: Block[] = [];
  const ungrouped: React.ReactNode[] = [];

  fields.forEach(entry => {
    const isNested = Array.isArray(entry);
    const term = isNested ? (entry as MadocNestedModelFields)[0] : (entry as string);
    const list = doc.properties[term] ?? [];

    if (isNested) {
      const [, nestedFields] = entry as MadocNestedModelFields;
      const entities = isEntityList(list) ? list : [];
      if (entities.length === 0) return;
      blocks.push({
        key: term,
        label: entities[0]?.label ?? term,
        boxed: true,
        fields: entities.map((entity, idx) => (
          <div key={entity.id ?? idx}>{collectBlocks(nestedFields, entity, [...pathPrefix, term, idx], onChange, readOnly).map(b => b.fields)}</div>
        )),
      });
      return;
    }

    const fieldList = !isEntityList(list) ? list : [];
    fieldList.forEach((field, idx) => {
      ungrouped.push(<FieldRow key={field.id ?? `${term}-${idx}`} field={field} path={[...pathPrefix, term, idx]} onChange={onChange} readOnly={readOnly} />);
    });
  });

  if (ungrouped.length > 0) {
    blocks.unshift({ key: '__ungrouped', label: null, fields: ungrouped });
  }

  return blocks;
}

// A simpler CaptureModelForm for reviewing: every field type (date, checkbox, dropdown, ...) is shown
// the same way -- a label and one text box -- so a reviewer can read and correct submitted data
// quickly. Sections sit side by side in 3 columns (1 on narrow screens); more than 3 wrap to a new row.
export function SubmissionFieldsForm({ model, document, onChange, readOnly }: SubmissionFieldsFormProps) {
  const models = resolveDisplayModels(model.structure);
  if (models.length === 0) {
    return null;
  }

  // With a single (implicit) model, top-level fields stay unlabeled as before -- only once there
  // are real sections do their own top-level fields need the model's label as a heading, the same
  // way a nested entity's fields already get one.
  const blocks = models.flatMap(m => {
    const modelBlocks = collectBlocks(m.fields, document, [], onChange, readOnly);
    return modelBlocks.map(b => ({
      ...b,
      key: `${m.id}::${b.key}`,
      label: models.length > 1 && b.key === '__ungrouped' ? m.label : b.label,
    }));
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
      {chunkForGrid(blocks).map(block =>
        block.boxed ? (
          <fieldset key={block.key} className="border border-gray-200 rounded-md p-3">
            {block.label && (
              <legend className="px-1 text-[0.68rem] font-bold uppercase tracking-wide text-cs-tertiary">
                {block.label}
              </legend>
            )}
            {block.fields}
          </fieldset>
        ) : (
          <div key={block.key}>
            {block.label && (
              <h3 className="text-[0.68rem] font-bold uppercase tracking-wide text-cs-tertiary mb-2.5 pb-1.5 border-b border-gray-200">
                {block.label}
              </h3>
            )}
            {block.fields}
          </div>
        )
      )}
    </div>
  );
}
