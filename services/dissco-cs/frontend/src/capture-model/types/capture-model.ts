import { AnnotationDocument } from './document';

export type NestedModelFields = [string, ModelFields];

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModelFields extends Array<string | NestedModelFields> {}

export type StructureNode = {
  id: string;
  label: string;
} & (
  | { type: 'choice'; items: StructureNode[] }
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
