import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuCircleHelp } from 'react-icons/lu';
import { MadocBaseFieldDto } from '@dissco-cs/shared-types';
import { fieldRegistry } from './fields/registry';
import { DocumentPath, pathsEqual } from '../../../utility/annotation-document';
import { isRequired } from './capture-model-rules';
import { SelectorControl, SelectorControls } from './SelectorControl';
import { IconButton } from '../../../components/ui/IconButton';
import { fieldHelpKey } from '../field-help';

interface FieldInputProps {
  field: MadocBaseFieldDto;
  path: DocumentPath;
  onChange: (path: DocumentPath, value: unknown) => void;
  selectorControls: SelectorControls;
  onShowHelp?: (helpKey: string) => void;
}

// One field of the form: its label, help button, input and draw control.
export function FieldInput({ field, path, onChange, selectorControls, onShowHelp }: FieldInputProps) {
  const { t } = useTranslation('dissco-cs');
  const FieldComponent = fieldRegistry[field.type];
  const labelText = (
    <>
      {field.label}
      {isRequired(field.required) && <span className="text-red-500"> *</span>}
    </>
  );
  const helpButton = onShowHelp && field.description?.trim() && (
    <IconButton
      icon={LuCircleHelp}
      label={t('annotate_field_help_label', { label: field.label })}
      onClick={() => onShowHelp(fieldHelpKey(path))}
    />
  );
  const selectorControl = field.selector && (
    <SelectorControl
      path={path}
      hasRegion={!!field.selector.state}
      isDrawing={pathsEqual(selectorControls.drawingPath, path)}
      controls={selectorControls}
    />
  );

  // A single checkbox reads as "[ ] text": the label wraps the box, so clicking the text toggles it.
  if (field.type === 'checkbox-field' && FieldComponent) {
    return (
      <div className="mb-4">
        <div className="flex items-center gap-0.5">
          <label className="flex items-center gap-2 text-[0.85rem] font-medium text-gray-700 cursor-pointer">
            <FieldComponent field={field} path={path} onChange={onChange} />
            <span>{labelText}</span>
          </label>
          {helpButton}
        </div>
        {selectorControl}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-0.5 mb-1">
        <label className="block text-[0.85rem] font-medium text-gray-700">{labelText}</label>
        {helpButton}
      </div>
      {FieldComponent ? (
        <FieldComponent field={field} path={path} onChange={onChange} />
      ) : (
        <p className="text-[0.8rem] text-gray-400">{t('annotate_field_type_unsupported', { type: field.type })}</p>
      )}
      {selectorControl}
    </div>
  );
}
