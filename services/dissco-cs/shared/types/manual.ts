import { z } from 'zod';
import { MultilingualText, PerLanguage, SitePageLang, sitePageLangSchema } from './common.js';

// Wire shape sent by manuals.routes.ts, built from the repository's own (differently
// named/shaped) `ManualAttachmentMeta` row -- `lang` is dropped (it's the record key) and
// `mime_type`/`file_size` are renamed to `mimeType`/`size`.
export type ManualAttachmentDto = { filename: string; mimeType: string; size: number };

export type ManualDto = {
  id: number;
  site_id: number;
  title: MultilingualText;
  content: MultilingualText;
  updated_at: string;
};

export type ManualSummaryDto = ManualDto & { linkedProjectSlugs: string[]; attachmentLangs: SitePageLang[] };

// Gedeelde vorm voor zowel de admin- (GET /manuals/:manualId) als de vrijwilligers-facing
// (GET /projects/:projectId/manual) detailrespons -- de admin-route stuurt op de server ook nog
// site_id/updated_at mee (ongewijzigd, zie bekende output-shaping-inconsistentie), maar geen enkele
// consument leest die velden, dus dit type belooft ze bewust niet.
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
export type SetManualTitleInput = z.infer<typeof setManualTitleSchema>;

export const setManualContentSchema = z.object({ content: z.string().max(MAX_MANUAL_CONTENT_LENGTH) });
export type SetManualContentInput = z.infer<typeof setManualContentSchema>;

export const attachmentFileSchema = z.instanceof(File).refine(f => f.size <= MAX_MANUAL_ATTACHMENT_LENGTH, 'File too large');
