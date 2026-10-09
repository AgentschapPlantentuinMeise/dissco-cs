// Plain data shape copied from madoc-ts's MadocBaseSelectorDto (services/madoc-ts/src/frontend/shared/capture-models/types/selector-types.ts).
// Only the wire-format data shape is copied here, not madoc-ts's React-component plumbing.
export type MadocBaseSelectorDto = {
  id: string;
  type: string;
  state: any;
  revisionId?: string | null;
  revises?: string | null;
};

export type MadocBoxSelectorState = {
  x: number;
  y: number;
  width: number;
  height: number;
} | null;

// Plain data shapes copied from madoc-ts's MadocBasePropertyDto/MadocBaseFieldDto
// (services/madoc-ts/src/frontend/shared/capture-models/types/base-property.ts, field-types.ts).
// Only the parts needed to read/write field values are kept; madoc-ts's React Component/Editor
// plumbing is intentionally left out.
export interface MadocBasePropertyDto {
  label: string;
  description?: string;
  term?: string;
  selector?: MadocBaseSelectorDto;
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
export type MadocFieldOptionDto = { value: string; label?: string; text?: string; description?: string };

export interface MadocBaseFieldDto extends MadocBasePropertyDto {
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
  options?: MadocFieldOptionDto[];
  multiline?: boolean;
}

// Same entity/properties tree shape as madoc-ts's "Document" type, renamed so it isn't
// confused with the browser's global Document.
export interface MadocAnnotationDocumentDto {
  id: string;
  type: 'entity';
  label?: string;
  selector?: MadocBaseSelectorDto;
  // Entities carry the same MadocBasePropertyDto config as fields do (required/dependent), set by
  // the model author — used to decide whether to show a "*" or hide the group conditionally.
  required?: boolean | string[];
  dependent?: string;
  properties: {
    [term: string]: Array<MadocBaseFieldDto> | Array<MadocAnnotationDocumentDto>;
  };
}

export type MadocNestedModelFields = [string, MadocModelFields];

export interface MadocModelFields extends Array<string | MadocNestedModelFields> {}

export type MadocStructureNodeDto = {
  id: string;
  label: string;
} & (
  | { type: 'choice'; items: MadocStructureNodeDto[]; profile?: string[] }
  | {
      type: 'model';
      fields: MadocModelFields;
      instructions?: string;
      modelRoot?: string[];
      forkValues?: boolean;
    }
);

export type MadocCaptureModelDto = {
  id?: string;
  structure: MadocStructureNodeDto;
  document: MadocAnnotationDocumentDto;
};

export type MadocCaptureModelRevisionDto = {
  id: string;
  structureId: string;
  fields: MadocModelFields;
  status: string;
  accepted?: boolean;
};

// Body sent to (and shape returned by) the create/update/get-revision endpoints -- `status` at
// the top level is only sent on accept (see useReviewPage's acceptOneRow), the actual
// draft/submitted/accepted status normally lives on `revision.status`.
export type MadocCaptureModelRevisionRequestDto = {
  captureModelId: string;
  document: MadocAnnotationDocumentDto;
  revision: MadocCaptureModelRevisionDto;
  status?: string;
};
