import { z } from 'zod';
import { SitePageLang, sitePageLangSchema } from './common.js';

// What dissco-cs keeps about a user next to Madoc's user: name and email stay in Madoc.
export interface UserProfileDto {
  // null: no preference, the site follows the browser.
  preferredLanguage: SitePageLang | null;
}

export const setPreferredLanguageSchema = z.strictObject({ language: sitePageLangSchema.nullable() });
export type SetPreferredLanguageInput = z.infer<typeof setPreferredLanguageSchema>;
