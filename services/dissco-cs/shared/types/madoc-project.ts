// Shapes of Madoc's project responses (modeled on madoc-ts's types/project-full.ts and
// schemas/project-list-item.ts), limited to the fields dissco-cs reads. Copied, not imported:
// dissco-cs and madoc-ts are separate services.
import { MadocInternationalString } from './common.js';

// 0 paused, 1 active, 2 completed, 3 archived, 4 prepared -- the values Madoc's
// update-project-status.ts accepts.
export type MadocProjectStatus = 0 | 1 | 2 | 3 | 4;

export type MadocProjectThumbnail = string | { id: string };

export type MadocProjectConfig = {
  maxContributionsPerResource?: number;
  contributionMode?: string;
  claimGranularity?: 'canvas' | 'manifest';
  modelPageOptions?: { enableAutoSave?: boolean };
} & Record<string, unknown>;

// Both the project list (one entry of `projects`) and a single project have this shape; only a
// single project includes `config`, and the list sends the image as `thumbnail`.
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
  config?: MadocProjectConfig;
};

// The paging info of Madoc's list endpoints; dissco-cs only reads totalPages.
export type MadocPagination = { totalPages?: number };

export type MadocProjectListPageDto = { projects: MadocProjectDto[]; pagination?: MadocPagination };
