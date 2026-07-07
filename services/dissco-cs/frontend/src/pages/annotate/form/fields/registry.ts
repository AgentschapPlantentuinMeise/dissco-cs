import { ComponentType } from 'react';
import { BaseField } from '../../../../capture-model/types/field-types';
import { DocumentPath } from '../document';
import { TextField } from './TextField';
import { HtmlField } from './HtmlField';
import { CheckboxField } from './CheckboxField';
import { DropdownField } from './DropdownField';
import { DateField } from './DateField';
import { AutocompleteField } from './AutocompleteField';
import { CheckboxListField } from './CheckboxListField';

export type FieldProps = {
  field: BaseField;
  path: DocumentPath;
  onChange: (path: DocumentPath, value: unknown) => void;
};

/** type-string -> component, the mechanism that makes the form renderer generic. Fase 2 adds more entries here. */
export const fieldRegistry: Record<string, ComponentType<FieldProps>> = {
  'text-field': TextField,
  'html-field': HtmlField,
  'checkbox-field': CheckboxField,
  'dropdown-field': DropdownField,
  'date-field': DateField,
  'autocomplete-field': AutocompleteField,
  'checkbox-list-field': CheckboxListField,
};
