// Field shapes modeled on madoc-ts's own Project/ProjectFull/ProjectListItem types
// (services/madoc-ts/src/types/project-full.ts, .../schemas/project-list-item.ts),
// limited to the fields dissco-cs actually reads. Not imported from madoc-ts directly --
// dissco-cs and madoc-ts are separate services.
import { MadocInternationalString } from './common.js';

// 0 paused, 1 active, 2 published/complete, 3 archived, 4 prepared; -1 draft/unpublished
// (see updateProjectStatus in frontend/src/api/madoc-client/projects.ts).
export type MadocProjectStatus = -1 | 0 | 1 | 2 | 3 | 4;

export type MadocProjectThumbnail = string | { id: string };

export type MadocProjectConfig = {
  maxContributionsPerResource?: number;
  contributionMode?: string;
  claimGranularity?: 'canvas' | 'manifest';
  modelPageOptions?: { enableAutoSave?: boolean };
} & Record<string, unknown>;

// Payload shape of Madoc's project endpoints -- both the project-list endpoint
// (GET /api/madoc/projects, one entry in `projects`) and the single-project endpoint
// (GET /api/madoc/projects/:id) return this same shape; the list endpoint just never
// populates `placeholderImage`/`config`.
export type MadocProjectDto = {
  id: number;
  collection_id: number;
  slug: string;
  task_id: string;
  label: MadocInternationalString;
  summary?: MadocInternationalString;
  status: MadocProjectStatus;
  thumbnail?: MadocProjectThumbnail;
  placeholderImage?: string;
  // Read by ProjectCard.tsx but not present in madoc-ts's own Project/ProjectFull types --
  // kept optional, worth verifying against a live response.
  templateOptions?: { image?: string };
  config?: MadocProjectConfig;
};

// Shared pagination envelope shape seen on multiple Madoc list endpoints (projects, admin
// collections, tasks) -- only `totalPages` has ever been read across those call sites.
export type MadocPagination = { totalPages?: number };

// Payload shape of Madoc's project-list endpoint's response envelope.
export type MadocProjectListPageDto = { projects: MadocProjectDto[]; pagination?: MadocPagination };
