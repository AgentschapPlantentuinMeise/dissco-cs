import React from 'react';
import { MadocModelFields, MadocNestedModelFields, MadocAnnotationDocumentDto, isRequired } from '@dissco-cs/shared-types';
import { DocumentPath } from '../../utility/annotation-document';
import { FieldRow, groupRangeFields, isDependentSatisfied, isEntityList } from './capture-model-rules';
import { Fieldset } from './Fieldset';
import { FieldInput } from './FieldInput';
import { SelectorControls } from './SelectorControl';

export interface FieldContext {
  document: MadocAnnotationDocumentDto;
  pathPrefix: DocumentPath;
  onChange: (path: DocumentPath, value: unknown) => void;
  selectorControls: SelectorControls;
  // Opens the Uitleg panel at a field's help; a field with a description then gets a question mark.
  onShowHelp?: (helpKey: string) => void;
}

// The inputs for a list of model fields, with a From/To pair side by side (see groupRangeFields).
export function ModelFields({ fields, ...context }: FieldContext & { fields: MadocModelFields }) {
  return <FieldRows rows={groupRangeFields(fields)} {...context} />;
}

// The inputs for rows of fields. A nested entry (an entity) becomes a framed group that renders its
// own fields again with ModelFields, one level deeper in the document path. A row of several fields
// puts them side by side; on a narrow panel they wrap below each other.
export function FieldRows({ rows, ...context }: FieldContext & { rows: FieldRow[] }) {
  const { document, pathPrefix, onChange, selectorControls, onShowHelp } = context;

  const renderFields = (term: string) => {
    const list = document.properties[term] ?? [];
    const fieldList = !isEntityList(list) ? list : [];
    return fieldList.flatMap((field, idx) =>
      isDependentSatisfied(field.dependent, document)
        ? [
            <FieldInput
              key={field.id ?? `${term}-${idx}`}
              field={field}
              path={[...pathPrefix, term, idx]}
              onChange={onChange}
              selectorControls={selectorControls}
              onShowHelp={onShowHelp}
            />,
          ]
        : []
    );
  };

  const renderEntity = ([term, nestedFields]: MadocNestedModelFields) => {
    const list = document.properties[term] ?? [];
    const entities = isEntityList(list) ? list : [];
    if (!isDependentSatisfied(entities[0]?.dependent, document)) return null;
    return (
      <Fieldset key={term} label={entities[0]?.label ?? term} required={isRequired(entities[0]?.required)} collapsible={false}>
        {entities.map((entity, idx) => (
          <div key={entity.id ?? idx} className="mb-2">
            <ModelFields {...context} fields={nestedFields} document={entity} pathPrefix={[...pathPrefix, term, idx]} />
          </div>
        ))}
      </Fieldset>
    );
  };

  return (
    <>
      {rows.map(row => {
        if (row.kind === 'row') {
          // A hidden field leaves no empty column, so the visible ones take the full width.
          const columns = row.terms.map(renderFields).filter(column => column.length > 0);
          return (
            <div key={row.terms.join('|')} className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-x-3">
              {columns.map((column, idx) => (
                <div key={idx}>{column}</div>
              ))}
            </div>
          );
        }
        return Array.isArray(row.entry) ? renderEntity(row.entry as MadocNestedModelFields) : renderFields(row.entry);
      })}
    </>
  );
}
