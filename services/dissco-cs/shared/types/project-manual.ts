import { SitePageLang } from './common.js';

// Wire shape sent by project-manuals.routes.ts, built from the repository's own (differently
// named/shaped) `ProjectManualAttachmentMeta` row -- `lang` is dropped (it's the record key) and
// `mime_type`/`file_size` are renamed to `mimeType`/`size`.
export type ProjectManualAttachmentMeta = { filename: string; mimeType: string; size: number };

export type ProjectManual = {
  id: number;
  site_id: number;
  title: Partial<Record<SitePageLang, string>>;
  content: Partial<Record<SitePageLang, string>>;
  updated_at: string;
};

export type ProjectManualSummary = ProjectManual & { linkedProjectSlugs: string[]; attachmentLangs: SitePageLang[] };

export type ProjectManualForVolunteer = {
  id: number;
  title: Partial<Record<SitePageLang, string>>;
  content: Partial<Record<SitePageLang, string>>;
  attachments: Partial<Record<SitePageLang, ProjectManualAttachmentMeta>>;
};

export type ProjectManualDetail = ProjectManual & {
  attachments: Partial<Record<SitePageLang, ProjectManualAttachmentMeta>>;
};
