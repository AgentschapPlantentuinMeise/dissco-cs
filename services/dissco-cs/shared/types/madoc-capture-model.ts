// Data shapes copied from madoc-ts's capture model types (frontend/shared/capture-models/types/):
// only the JSON that goes over the wire, not Madoc's React components.
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

export interface MadocBasePropertyDto {
  label: string;
  description?: string;
  term?: string;
  selector?: MadocBaseSelectorDto;
  allowMultiple?: boolean;
  // The model editor saves a ticked checkbox (required, clearable, ...) as the array ['on'], not
  // as true -- seen in a real model.
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

// One choice of a dropdown or checkbox-list field. A dropdown reads value and text, a checkbox
// list reads value, label and description.
export type MadocFieldOptionDto = { value: string; label?: string; text?: string; description?: string };

export interface MadocBaseFieldDto extends MadocBasePropertyDto {
  id: string;
  type: string;
  // The real shape of the value (text, true/false, a list, { uri, label }, ...) depends on `type`;
  // each field component reads it in its own shape, hence `any`.
  value: any;
  // Only set on some field types: the model editor stores them directly on the field.
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

// What the create, update and get revision endpoints take and return. The status normally lives
// in revision.status ('draft', 'submitted'); the top-level status is only sent when a reviewer
// accepts.
export type MadocCaptureModelRevisionRequestDto = {
  captureModelId: string;
  document: MadocAnnotationDocumentDto;
  revision: MadocCaptureModelRevisionDto;
  status?: string;
};
