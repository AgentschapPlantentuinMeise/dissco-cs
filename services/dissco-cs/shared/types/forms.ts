import { z } from 'zod';
import { MadocInternationalString } from './common.js';
import { MadocProjectStatus } from './madoc-project.js';
import { FormLayoutItem, formLayoutItemsSchema } from './form-layout.js';

// A form is a Madoc capture model, known by its name: the label of the model's top structure. A
// project copied from another keeps that name, so everything stored for a form (its layout,
// institution and manual) carries over to the copy without linking it again.
export const MAX_FORM_NAME_LENGTH = 500;

// Not trimmed: the name must match Madoc's exactly, spaces included.
export const formNameSchema = z.string().min(1).max(MAX_FORM_NAME_LENGTH);

const idOrNull = z.union([z.number().int(), z.string().regex(/^\d+$/).transform(Number)]).nullable();

// Everything of one form at once. A null layout means the form shows Madoc's own field order. The
// template project is the Madoc project an admin duplicates (in Madoc's admin) to start a new
// project with this form; it must be one of the form's own projects.
export const formSaveSchema = z.object({
  formName: formNameSchema,
  templateProjectId: idOrNull,
  institutionId: idOrNull,
  manualId: idOrNull,
  layout: formLayoutItemsSchema.nullable(),
});

export type FormSave = z.infer<typeof formSaveSchema>;

export type FormProjectDto = {
  id: number;
  slug: string;
  label: MadocInternationalString;
  status: MadocProjectStatus;
};

// A form as the admin list shows it: every form name a project uses, plus a stored form whose name
// no project has any more (the model was renamed in Madoc), so it can still be found and emptied.
export type FormDto = {
  formName: string;
  templateProjectId: number | null;
  institutionId: number | null;
  manualId: number | null;
  layout: FormLayoutItem[] | null;
  projects: FormProjectDto[];
};
