import { z } from 'zod';
import { MultilingualText, SITE_PAGE_LANGS } from './common.js';

// One step of "How it works" on Home, set in page management. The list is saved as a whole; its
// order is the order on Home.
export interface HomeStepDto {
  title: MultilingualText;
  body: MultilingualText;
}

export const MAX_HOME_STEPS = 4;
export const MAX_HOME_STEP_TITLE_LENGTH = 80;
export const MAX_HOME_STEP_BODY_LENGTH = 300;

// Every site language filled in, like the other texts in page management.
const everyLanguage = (max: number) =>
  z.strictObject(Object.fromEntries(SITE_PAGE_LANGS.map(lang => [lang, z.string().trim().min(1).max(max)])));

const homeStepSchema = z.strictObject({
  title: everyLanguage(MAX_HOME_STEP_TITLE_LENGTH),
  body: everyLanguage(MAX_HOME_STEP_BODY_LENGTH),
});

// An empty list removes the section from Home.
export const setHomeStepsSchema = z.strictObject({
  steps: z.array(homeStepSchema).max(MAX_HOME_STEPS),
});
