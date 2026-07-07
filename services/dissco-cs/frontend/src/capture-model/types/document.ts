import { BaseField } from './field-types';
import { BaseSelector } from './selector-types';

// Same entity/properties tree shape as madoc-ts's "Document" type, renamed so it isn't
// confused with the browser's global Document.
export interface AnnotationDocument {
  id: string;
  type: 'entity';
  label?: string;
  selector?: BaseSelector;
  // Entities carry the same BaseProperty config as fields do (required/dependent), set by
  // the model author — used to decide whether to show a "*" or hide the group conditionally.
  required?: boolean | string[];
  dependent?: string;
  properties: {
    [term: string]: Array<BaseField> | Array<AnnotationDocument>;
  };
}
