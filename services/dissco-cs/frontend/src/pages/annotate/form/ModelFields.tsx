import React from 'react';
import { useTranslation } from 'react-i18next';
import { MadocModelFields, MadocNestedModelFields, MadocAnnotationDocumentDto } from '@dissco-cs/shared-types';
import { fieldRegistry } from './fields/registry';
import { DocumentPath, pathsEqual } from '../../../utility/annotation-document';
import { isDependentSatisfied, isEntityList, isRequired } from './capture-model-rules';
import { Fieldset } from './Fieldset';
import { SelectorControl, SelectorControls } from './SelectorControl';

interface ModelFieldsProps {
  fields: MadocModelFields;
  document: MadocAnnotationDocumentDto;
  pathPrefix: DocumentPath;
  onChange: (path: DocumentPath, value: unknown) => void;
  selectorControls: SelectorControls;
}

// The inputs for a list of model fields. A nested entry (an entity) becomes a framed group that
// renders its own fields again with this component, one level deeper in the document path.
export function ModelFields({ fields, document, pathPrefix, onChange, selectorControls }: ModelFieldsProps) {
  const { t } = useTranslation('dissco-cs');

  return (
    <>
      {fields.map(entry => {
        const isNested = Array.isArray(entry);
        const term = isNested ? (entry as MadocNestedModelFields)[0] : (entry as string);
        const list = document.properties[term] ?? [];

        if (isNested) {
          const [, nestedFields] = entry as MadocNestedModelFields;
          const entities = isEntityList(list) ? list : [];
          if (!isDependentSatisfied(entities[0]?.dependent, document)) return null;
          return (
            <Fieldset key={term} label={entities[0]?.label ?? term} required={isRequired(entities[0]?.required)} collapsible={false}>
              {entities.map((entity, idx) => (
                <div key={entity.id ?? idx} className="mb-2">
                  <ModelFields
                    fields={nestedFields}
                    document={entity}
                    pathPrefix={[...pathPrefix, term, idx]}
                    onChange={onChange}
                    selectorControls={selectorControls}
                  />
                </div>
              ))}
            </Fieldset>
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
                <p className="text-[0.8rem] text-gray-400">{t('annotate_field_type_unsupported', { type: field.type })}</p>
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
      })}
    </>
  );
}
