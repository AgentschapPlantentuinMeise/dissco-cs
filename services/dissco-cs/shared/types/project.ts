import { z } from 'zod';
import { MadocInternationalString } from './common.js';

// Project links: which manual / institution a Madoc project points at (null = unlink).
const idOrNull = z.union([z.number().int(), z.string().regex(/^\d+$/).transform(Number)]).nullable();
export const setManualLinkSchema = z.object({ manualId: idOrNull });
export const setInstitutionLinkSchema = z.object({ institutionId: idOrNull });
export const pruneProjectLinksSchema = z.object({ liveSlugs: z.array(z.string().trim().min(1)).min(1) });

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
