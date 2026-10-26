import { ManualSummaryDto, MultilingualText, SITE_PAGE_LANGS, SitePageLang } from '@dissco-cs/shared-types';

export type ManualContentCheck = {
  // Languages where text or an attachment is missing while another language has one.
  missingLangs: SitePageLang[];
  // At least some text or an attachment.
  hasContent: boolean;
};

const isFilled = (text: string | undefined) => (text ?? '').trim().length > 0;

// The content rule of a manual: text, an attachment or both, and each kind, once used in one
// language, in every language. A visitor then never opens a manual that is empty in their language.
export function checkManualContent(content: MultilingualText, attachmentLangs: SitePageLang[]): ManualContentCheck {
  const anyText = SITE_PAGE_LANGS.some(lang => isFilled(content[lang]));
  const anyAttachment = attachmentLangs.length > 0;
  const missingLangs = SITE_PAGE_LANGS.filter(
    lang => (anyText && !isFilled(content[lang])) || (anyAttachment && !attachmentLangs.includes(lang))
  );
  return { missingLangs, hasContent: anyText || anyAttachment };
}

// Whether a manual may be linked to a project. Only the content counts: a manual whose title is
// not yet in every language still shows a title (the first filled one).
export function manualHasContent(manual: ManualSummaryDto): boolean {
  const check = checkManualContent(manual.content, manual.attachmentLangs);
  return check.hasContent && check.missingLangs.length === 0;
}

// The attachments a manual will have once the form is saved: a picked file adds or replaces one,
// null removes the stored one, and a language that was not touched keeps what it had.
export function attachmentLangsAfterSave(
  stored: SitePageLang[],
  picked: Partial<Record<SitePageLang, File | null>>
): SitePageLang[] {
  return SITE_PAGE_LANGS.filter(lang => (lang in picked ? picked[lang] !== null : stored.includes(lang)));
}
