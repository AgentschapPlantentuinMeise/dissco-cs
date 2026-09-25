import { AnnotationDocument } from './annotation-document.js';

export type NestedModelFields = [string, ModelFields];

export interface ModelFields extends Array<string | NestedModelFields> {}

export type StructureNode = {
  id: string;
  label: string;
} & (
  | { type: 'choice'; items: StructureNode[]; profile?: string[] }
  | {
      type: 'model';
      fields: ModelFields;
      instructions?: string;
      modelRoot?: string[];
      forkValues?: boolean;
    }
);

export type CaptureModel = {
  id?: string;
  structure: StructureNode;
  document: AnnotationDocument;
};

export type CaptureModelRevision = {
  id: string;
  structureId: string;
  fields: ModelFields;
  status: string;
  accepted?: boolean;
};

// Body sent to (and shape returned by) the create/update/get-revision endpoints -- `status` at
// the top level is only sent on accept (see useReviewTasksController's acceptOneRow), the actual
// draft/submitted/accepted status normally lives on `revision.status`.
export type CaptureModelRevisionRequest = {
  captureModelId: string;
  document: AnnotationDocument;
  revision: CaptureModelRevision;
  status?: string;
};
