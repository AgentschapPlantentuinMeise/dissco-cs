import { MadocBaseFieldDto } from './madoc-field-types.js';
import { MadocBaseSelectorDto } from './madoc-selector-types.js';

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
