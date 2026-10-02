import { MadocInternationalString } from './common.js';

export type ReviewTaskDto = {
  id: string;
  project: { id?: number; slug?: string; label?: MadocInternationalString | string };
  subject: { id?: number; label?: MadocInternationalString | string };
  subject_raw?: string;
  subject_parent_raw?: string;
  status: number;
  status_text?: string;
  submitter?: string;
  submitterId?: number;
  reviewer?: string;
  reviewerId?: number;
  originalTaskId?: string;
  revisionId?: string;
  modified_at: number;
};
