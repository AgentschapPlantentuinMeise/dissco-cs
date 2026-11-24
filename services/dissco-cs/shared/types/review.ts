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

// The reviewer's open reviews. incomplete: the submitter and revision of some reviews could not be
// looked up (a project's lookup failed); those rows are listed with these fields empty.
export type ReviewTaskListDto = {
  tasks: ReviewTaskDto[];
  incomplete: boolean;
};
