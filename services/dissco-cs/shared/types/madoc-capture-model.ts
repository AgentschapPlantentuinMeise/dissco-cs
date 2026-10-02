import { MadocAnnotationDocumentDto } from './madoc-annotation-document.js';

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
// the top level is only sent on accept (see useReviewTasksController's acceptOneRow), the actual
// draft/submitted/accepted status normally lives on `revision.status`.
export type MadocCaptureModelRevisionRequestDto = {
  captureModelId: string;
  document: MadocAnnotationDocumentDto;
  revision: MadocCaptureModelRevisionDto;
  status?: string;
};
