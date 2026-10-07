import { MadocInternationalString } from './common.js';

export type ProjectProgressDto = {
  transcribedPercentage: number;
  totalTasks: number;
  allTasksTaken: boolean;
  availableManifests: Array<{ id: number; label: unknown; thumbnail?: string }>;
};

export type ProjectDebugTaskEntryDto = {
  id: string;
  status: number;
  status_text?: string;
  assignee?: string;
  modified_at: number;
};

export type ProjectDebugManifestDto = {
  manifestId: number;
  label?: MadocInternationalString | string;
  countsAsTranscribed: boolean;
  tasks: ProjectDebugTaskEntryDto[];
};

export type ProjectDebugDto = {
  totalManifests: number;
  transcribedPercentage: number;
  manifests: ProjectDebugManifestDto[];
};
