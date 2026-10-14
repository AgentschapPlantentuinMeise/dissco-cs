import { MadocInternationalString } from './common.js';

// Built by getMadocReviewTasks() (madoc-client/reviews.ts) from Madoc tasks -- our own shape, so
// camelCase, even for the fields taken over from Madoc.
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
