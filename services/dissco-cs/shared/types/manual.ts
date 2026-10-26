import { z } from 'zod';
import { MultilingualText, PerLanguage, SITE_PAGE_LANGS, SitePageLang, multilingualTextSchema } from './common.js';

export type ManualAttachmentDto = { filename: string; mimeType: string; size: number };

export type ManualDto = {
  id: number;
  title: MultilingualText;
  content: MultilingualText;
  updatedAt: string;
};

export type ManualSummaryDto = ManualDto & { linkedProjectSlugs: string[]; attachmentLangs: SitePageLang[] };

export type ManualDetailDto = {
  id: number;
  title: MultilingualText;
  content: MultilingualText;
  attachments: PerLanguage<ManualAttachmentDto>;
};

export const MAX_MANUAL_TITLE_LENGTH = 200;
export const MAX_MANUAL_CONTENT_LENGTH = 200_000;
export const MAX_MANUAL_ATTACHMENT_LENGTH = 8_000_000;

// A manual's text: Markdown per language, where `## ` headings become the sections and
// {{attachment}} places the attachment. Text in one language means text in every language, so a
// visitor never gets an empty manual in theirs. Attachments are uploaded separately, so their
// "every language or none" rule is checked by the form, not here.
const manualContentSchema = z
  .object(
    Object.fromEntries(SITE_PAGE_LANGS.map(lang => [lang, z.string().max(MAX_MANUAL_CONTENT_LENGTH).optional()])) as Record<
      SitePageLang,
      z.ZodOptional<z.ZodString>
    >
  )
  .refine(content => {
    const filled = SITE_PAGE_LANGS.filter(lang => (content[lang] ?? '').trim().length > 0).length;
    return filled === 0 || filled === SITE_PAGE_LANGS.length;
  }, 'Text must be filled in for every language or for none');

// A manual as the management form sends it: the title in every language, plus the text.
export const manualInputSchema = z.object({
  title: multilingualTextSchema(true, MAX_MANUAL_TITLE_LENGTH),
  content: manualContentSchema,
});

export type ManualInput = z.infer<typeof manualInputSchema>;

export const attachmentFileSchema = z.instanceof(File).refine(f => f.size <= MAX_MANUAL_ATTACHMENT_LENGTH, 'File too large');
