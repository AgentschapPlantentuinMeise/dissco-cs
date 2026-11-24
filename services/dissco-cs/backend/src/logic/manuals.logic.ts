import { MultilingualText, SitePageLang, attachmentLangsAfterSave, checkManualContent } from '@dissco-cs/shared-types';

export type AttachmentPlan =
  | { ok: true; upload: SitePageLang[]; remove: SitePageLang[] }
  | { ok: false; error: string };

// Which attachments a save adds, replaces or removes, checked against the content rule on the
// attachments the manual has after the save. Everything here is decided before anything is
// written, so a refused save changes nothing.
export function planManualAttachments(
  content: MultilingualText,
  stored: SitePageLang[],
  uploadLangs: SitePageLang[],
  removeLangs: SitePageLang[]
): AttachmentPlan {
  const both = uploadLangs.filter(lang => removeLangs.includes(lang));
  if (both.length > 0) {
    return { ok: false, error: `An attachment is both added and removed for: ${both.join(', ')}` };
  }

  // Removing a language that has no attachment is a no-op, not an error.
  const remove = removeLangs.filter(lang => stored.includes(lang));
  const picked: Partial<Record<SitePageLang, true | null>> = {};
  remove.forEach(lang => (picked[lang] = null));
  uploadLangs.forEach(lang => (picked[lang] = true));

  const check = checkManualContent(content, attachmentLangsAfterSave(stored, picked));
  if (!check.hasContent) {
    return { ok: false, error: 'A manual needs text or an attachment' };
  }
  if (check.missingLangs.length > 0) {
    return { ok: false, error: `Text or attachment missing for: ${check.missingLangs.join(', ')}` };
  }

  return { ok: true, upload: uploadLangs, remove };
}
