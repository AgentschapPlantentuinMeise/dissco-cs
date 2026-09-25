import { BaseSelector } from './selector-types.js';

// Plain data shapes copied from madoc-ts's BaseProperty/BaseField
// (services/madoc-ts/src/frontend/shared/capture-models/types/base-property.ts, field-types.ts).
// Only the parts needed to read/write field values are kept; madoc-ts's React Component/Editor
// plumbing is intentionally left out.
export interface BaseProperty {
  label: string;
  description?: string;
  term?: string;
  selector?: BaseSelector;
  allowMultiple?: boolean;
  // The admin model-editor's checkbox controls (required, clearable, ...) save their "checked"
  // state as the array ['on'] rather than a boolean true — confirmed by inspecting a real model.
  required?: boolean | string[];
  // The model-editor saves the "depends on" setting under the key "dependent" (American spelling)
  // on the field itself, even though madoc-ts's own TS types/hooks elsewhere use "dependant" —
  // an inconsistency in madoc-ts itself. We follow the real wire data, not the TS source.
  dependent?: string;
  // Must be set to the submitted revision's id on any field we change — madoc-ts's
  // extract-valid-revision-changes.ts only treats a field as part of a revision (and merges its
  // value into the canonical document) when `field.revision === revision.id`. An untagged change
  // is silently dropped server-side: the save request succeeds, but nothing is persisted.
  revision?: string;
}

// Option entry as used by dropdown/checkbox-list fields -- the two widgets read different subsets
// (dropdown: value+text, checkbox-list: value+label+description), kept together since both live
// under the same field.options key.
export type FieldOption = { value: string; label?: string; text?: string; description?: string };

export interface BaseField extends BaseProperty {
  id: string;
  type: string;
  // The field's actual runtime shape (string, boolean, string[], {uri,label}, ...) depends
  // entirely on `type`, which none of the field components (TextField, CheckboxField, ...)
  // discriminate on structurally -- each just reads field.value assuming its own shape.
  value: any;
  // Present only on specific field types -- Madoc's model-editor stores these directly on the
  // field config rather than through a discriminated union.
  dataSource?: string;
  placeholder?: string;
  options?: FieldOption[];
  multiline?: boolean;
}
