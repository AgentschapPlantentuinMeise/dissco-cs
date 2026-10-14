import { z } from 'zod';
import { MultilingualText, PerLanguage, SitePageLang, sitePageLangSchema } from './common.js';

// Wire shape, built by toManualDetailDto() at the bottom of manuals.repository.ts from the
// `ManualAttachmentMeta` row -- `lang` is dropped (it's the record key) and
// `mime_type`/`file_size` are renamed to `mimeType`/`size`.
export type ManualAttachmentDto = { filename: string; mimeType: string; size: number };

export type ManualDto = {
  id: number;
  title: MultilingualText;
  content: MultilingualText;
  updatedAt: string;
};

export type ManualSummaryDto = ManualDto & { linkedProjectSlugs: string[]; attachmentLangs: SitePageLang[] };

// Shared detail shape for both the admin (GET /manuals/:manualId) and the volunteer-facing
// (GET /projects/:projectId/manual) response.
export type ManualDetailDto = {
  id: number;
  title: MultilingualText;
  content: MultilingualText;
  attachments: PerLanguage<ManualAttachmentDto>;
};

export const MAX_MANUAL_TITLE_LENGTH = 200;
export const MAX_MANUAL_CONTENT_LENGTH = 200_000;
export const MAX_MANUAL_ATTACHMENT_LENGTH = 8_000_000;

export const setManualTitleSchema = z.object({
  lang: sitePageLangSchema,
  title: z.string().trim().min(1).max(MAX_MANUAL_TITLE_LENGTH),
});

export const setManualContentSchema = z.object({ content: z.string().max(MAX_MANUAL_CONTENT_LENGTH) });

export const attachmentFileSchema = z.instanceof(File).refine(f => f.size <= MAX_MANUAL_ATTACHMENT_LENGTH, 'File too large');
