/** Minimal subset of Madoc's CrowdsourcingTask type — only the fields the citizen-science UI reads. */
export type CrowdsourcingTask = {
  id: string;
  name?: string;
  status: number;
  subject?: string;
  subject_parent?: string;
  root_task?: string;
  modified_at?: string;
  // Server-resolved project this task belongs to — present whenever Madoc could trace the task's
  // parent_task chain to a project, regardless of whether root_task itself is set.
  metadata?: {
    project?: {
      id: number;
      slug: string;
      label?: Record<string, string[]> | string;
    };
  };
};
