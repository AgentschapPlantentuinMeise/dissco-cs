import { ManualSummaryDto } from '@dissco-cs/shared-types';
import { LANGUAGES } from '../../../utility/site-lang-text';

export function manualHasContent(manual: ManualSummaryDto): boolean {
  // A language counts as filled in when it has text OR an attachment (the same rule as
  // ManualContentEditor); the manual only counts as having content when every language is.
  return LANGUAGES.every(lang => (manual.content[lang.code] ?? '').trim().length > 0 || manual.attachmentLangs.includes(lang.code));
}
