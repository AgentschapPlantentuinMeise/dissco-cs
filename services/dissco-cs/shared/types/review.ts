import { MadocInternationalString } from './common.js';

export type ReviewTaskDto = {
  id: string;
  project: { id?: number; slug?: string; label?: MadocInternationalString | string };
  subject: { id?: number; label?: MadocInternationalString | string };
  subjectRaw?: string;
  subjectParentRaw?: string;
  status: number;
  statusText?: string;
  submitter?: string;
  submitterId?: number;
  reviewer?: string;
  reviewerId?: number;
  originalTaskId?: string;
  revisionId?: string;
  modifiedAt: number;
};
