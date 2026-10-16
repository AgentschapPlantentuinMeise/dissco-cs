import { MadocInternationalString } from './common.js';

// Madoc's task, limited to the fields dissco-cs reads. `parameters` is only read for review
// tasks: its first entry is the id of the task under review.
export type MadocCrowdsourcingTaskDto = {
  id: string;
  name?: string;
  status: number;
  status_text?: string;
  subject?: string;
  subject_parent?: string;
  root_task?: string;
  parameters?: unknown[];
  // Madoc sends this as a number (milliseconds since 1970), not as a date string.
  modified_at?: number;
  assignee?: { id: string; name?: string };
  // Not from Madoc: we fill these in ourselves for the stuck-tasks page (getStuckManifestCounters),
  // from the task's details and a count of its subtasks that were not abandoned.
  maxContributors?: number;
  validCount?: number;
  // Server-resolved project this task belongs to — present whenever Madoc could trace the task's
  // parent_task chain to a project, regardless of whether root_task itself is set.
  metadata?: {
    project?: {
      id: number;
      slug: string;
      label?: MadocInternationalString | string;
    };
    subject?: {
      id: number;
      type: string;
      label?: MadocInternationalString | string;
      thumbnail?: string;
    };
  };
};

// A claim, as in the prepare-claim, claim and random responses. `state.revisionId` is set when
// dissco-cs creates the claim (use-task-claim); older claims, or ones made in Madoc, lack it.
export type MadocResourceClaimDto = {
  id: string;
  status: number;
  state?: { revisionId?: string };
};

export type MadocPrepareClaimDto = {
  model: { id: string; label: string };
  claim?: MadocResourceClaimDto;
};

export type MadocCreateResourceClaimDto = {
  claim?: MadocResourceClaimDto;
};

export type MadocRandomManifestDto = {
  remainingTasks: number;
  manifest: number;
  claim?: MadocResourceClaimDto;
};
