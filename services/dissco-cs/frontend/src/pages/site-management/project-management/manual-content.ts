import { ManualSummaryDto } from '@dissco-cs/shared-types';
import { LANGUAGES } from '../../../utility/site-lang-text';

export function manualHasContent(manual: ManualSummaryDto): boolean {
  // Elke taal telt als ingevuld zodra ze tekst OF een bijlage heeft -- zelfde regel als in de
  // handleiding-editor (ManualContentEditor), enkel volledig ingevuld (alle talen) telt als inhoud.
  return LANGUAGES.every(lang => (manual.content[lang.code] ?? '').trim().length > 0 || manual.attachmentLangs.includes(lang.code));
}
