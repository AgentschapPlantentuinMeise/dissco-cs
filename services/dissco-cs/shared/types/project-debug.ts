import { MadocInternationalString } from './common.js';

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
