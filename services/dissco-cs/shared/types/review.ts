import { InternationalString } from './madoc-project.js';

export type ReviewTaskRow = {
  id: string;
  project: { id?: number; slug?: string; label?: InternationalString | string };
  subject: { id?: number; label?: InternationalString | string };
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
