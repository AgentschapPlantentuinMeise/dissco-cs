/** Minimal subset of Madoc's CrowdsourcingTask type — only the fields the citizen-science UI reads. */
export type CrowdsourcingTask = {
  id: string;
  name?: string;
  status: number;
  status_text?: string;
  subject?: string;
  subject_parent?: string;
  root_task?: string;
  // tasks-api actually returns this as an epoch-ms number, not a string — the existing
  // `(a.modified_at ?? '') > (b.modified_at ?? '')` sort comparisons in UserDashboard/Dashboard
  // still work either way since JS compares numbers-as-strings the same direction, but a real
  // numeric subtraction (as used for sorting here) needs the accurate type.
  modified_at?: number;
  assignee?: { id: string; name?: string };
  // Server-resolved project this task belongs to — present whenever Madoc could trace the task's
  // parent_task chain to a project, regardless of whether root_task itself is set.
  metadata?: {
    project?: {
      id: number;
      slug: string;
      label?: Record<string, string[]> | string;
    };
    subject?: {
      id: number;
      type: string;
      label?: Record<string, string[]> | string;
      thumbnail?: string;
    };
  };
};
