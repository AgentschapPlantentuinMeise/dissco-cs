import { MadocInternationalString } from './common.js';

export type ProjectProgressDto = {
  transcribedPercentage: number;
  totalTasks: number;
  allTasksTaken: boolean;
  // People with at least one submitted or accepted task in the project.
  volunteers: number;
};

// The project page also lists the manifests that can still be picked, with their thumbnails.
// Project cards only show the numbers, so they get ProjectProgressDto without this list: fetching
// the thumbnails costs a Madoc call per 24 manifests.
export type ProjectProgressWithManifestsDto = ProjectProgressDto & {
  availableManifests: Array<{ id: number; label?: MadocInternationalString; thumbnail?: string }>;
};

export type ProjectDebugTaskEntryDto = {
  id: string;
  status: number;
  statusText?: string;
  assignee?: string;
  modifiedAt: number;
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
