import { InternationalString } from './madoc-project.js';

export type ProjectDebugTaskEntry = {
  id: string;
  status: number;
  status_text?: string;
  assignee?: string;
  modified_at: number;
};

export type ProjectDebugManifest = {
  manifestId: number;
  label?: InternationalString | string;
  countsAsTranscribed: boolean;
  tasks: ProjectDebugTaskEntry[];
};

export type ProjectDebugResult = {
  totalManifests: number;
  transcribedPercentage: number;
  manifests: ProjectDebugManifest[];
};
