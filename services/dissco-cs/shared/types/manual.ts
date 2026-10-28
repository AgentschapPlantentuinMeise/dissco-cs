import { z } from 'zod';
import { MultilingualText, PerLanguage, SITE_PAGE_LANGS, SitePageLang, multilingualTextSchema, sitePageLangSchema } from './common.js';

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
// Also the file input's accept list. The backend checks the file's content against it, because
// the type a browser reports is not reliable (a real PDF can arrive as application/octet-stream).
export const MANUAL_ATTACHMENT_MIME_TYPES = ['application/pdf'] as const;

// A manual's text: Markdown per language, where `## ` headings become the sections and
// {{attachment}} places the attachment. Text in one language means text in every language, so a
// visitor never gets an empty manual in theirs. The attachments are files next to this JSON, so
// their "every language or none" rule is checked with checkManualContent, not here.
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

// A manual as Save sends it, in the multipart field "data": the text, plus the languages whose
// stored attachment must go. New attachments are the file fields attachment_<lang> next to it.
export const manualSaveSchema = manualInputSchema.extend({
  removeAttachments: z.array(sitePageLangSchema).default([]),
});

export type ManualSave = z.infer<typeof manualSaveSchema>;

/**
 * The multipart field of a new attachment next to "data". No dot in the name: Hono would read
 * "attachment.nl" as a nested object.
 * @param lang the attachment's language (SITE_PAGE_LANGS)
 * Returns: the field name, e.g. "attachment_nl".
 */
export function manualAttachmentField(lang: SitePageLang): string {
  return `attachment_${lang}`;
}

export type ManualContentCheck = {
  // Languages where text or an attachment is missing while another language has one.
  missingLangs: SitePageLang[];
  // At least some text or an attachment.
  hasContent: boolean;
};

const isFilled = (text: string | undefined) => (text ?? '').trim().length > 0;

/**
 * The content rule of a manual: text, an attachment or both, and each kind, once used in one
 * language, in every language. A visitor then never opens a manual that is empty in their language.
 * @param content the Markdown per language (ManualInput.content)
 * @param attachmentLangs the languages that have an attachment (after the save, see attachmentLangsAfterSave)
 * Returns: the languages that break the rule, and whether there is any content at all.
 */
export function checkManualContent(content: MultilingualText, attachmentLangs: SitePageLang[]): ManualContentCheck {
  const anyText = SITE_PAGE_LANGS.some(lang => isFilled(content[lang]));
  const anyAttachment = attachmentLangs.length > 0;
  const missingLangs = SITE_PAGE_LANGS.filter(
    lang => (anyText && !isFilled(content[lang])) || (anyAttachment && !attachmentLangs.includes(lang))
  );
  return { missingLangs, hasContent: anyText || anyAttachment };
}

/**
 * The languages that have an attachment once a save is done: a new file adds or replaces one, null
 * removes the stored one, and a language that is not in picked keeps what it had.
 * @param stored the languages with an attachment now (ManualSummaryDto.attachmentLangs)
 * @param picked per language a new file, or null to remove the stored one
 * Returns: the languages with an attachment after the save, in SITE_PAGE_LANGS order.
 */
export function attachmentLangsAfterSave<T>(stored: SitePageLang[], picked: Partial<Record<SitePageLang, T | null>>): SitePageLang[] {
  return SITE_PAGE_LANGS.filter(lang => (lang in picked ? picked[lang] !== null : stored.includes(lang)));
}

export const attachmentFileSchema = z.instanceof(File).refine(f => f.size <= MAX_MANUAL_ATTACHMENT_LENGTH, 'File too large');
