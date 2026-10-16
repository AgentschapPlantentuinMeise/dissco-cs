import { ComponentType } from 'react';
import { MadocBaseFieldDto } from '@dissco-cs/shared-types';
import { DocumentPath } from '../../../../utility/annotation-document';
import { TextField } from './TextField';
import { HtmlField } from './HtmlField';
import { CheckboxField } from './CheckboxField';
import { DropdownField } from './DropdownField';
import { DateField } from './DateField';
import { AutocompleteField } from './AutocompleteField';
import { CheckboxListField } from './CheckboxListField';

export type FieldProps = {
  field: MadocBaseFieldDto;
  path: DocumentPath;
  onChange: (path: DocumentPath, value: unknown) => void;
};

/** Field type -> the component that renders it; this keeps the form generic. A type missing here is shown as "not supported yet". */
export const fieldRegistry: Record<string, ComponentType<FieldProps>> = {
  'text-field': TextField,
  'html-field': HtmlField,
  'checkbox-field': CheckboxField,
  'dropdown-field': DropdownField,
  'date-field': DateField,
  'autocomplete-field': AutocompleteField,
  'checkbox-list-field': CheckboxListField,
};
