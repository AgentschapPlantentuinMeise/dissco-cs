import { MadocInternationalString } from './common.js';

/**
 * Minimal subset of Madoc's MadocCrowdsourcingTaskDto type — only the fields dissco-cs reads. Shared by
 * the citizen-science UI (claim/task payloads) and the API's own raw task-list fetches
 * (project-debug, review, stuck-tasks) — those used to each redeclare their own near-identical
 * copy of this same shape; `parameters` exists only for the review-task copy's needs.
 */
export type MadocCrowdsourcingTaskDto = {
  id: string;
  name?: string;
  status: number;
  status_text?: string;
  subject?: string;
  subject_parent?: string;
  root_task?: string;
  parameters?: unknown[];
  // tasks-api actually returns this as an epoch-ms number, not a string — the existing
  // `(a.modified_at ?? '') > (b.modified_at ?? '')` sort comparisons in UserDashboard/Dashboard
  // still work either way since JS compares numbers-as-strings the same direction, but a real
  // numeric subtraction (as used for sorting here) needs the accurate type.
  modified_at?: number;
  assignee?: { id: string; name?: string };
  // dissco-cs-computed, not part of Madoc's own wire format -- only populated by the
  // stuck-manifest-counter feature (getStuckManifestCounters), which resolves these from a
  // separate task-detail call + a local count of non-abandoned subtasks.
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

// Resource claim, as embedded in prepare-claim/claim/random responses -- `state.revisionId` is
// only present once a claim has an in-progress revision attached to it.
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
