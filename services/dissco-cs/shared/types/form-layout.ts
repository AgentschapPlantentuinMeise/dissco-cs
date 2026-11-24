import { z } from 'zod';
import { MultilingualText, multilingualTextSchema } from './common.js';

// A form layout places the fields of a Madoc capture model in rows and sections on the annotation
// page. It belongs to a form (see forms.ts), so every project with that form name uses it. A field
// is named by its term: the property name in the model's document, which stays the same in every
// copy Madoc makes of the model.

export const MAX_FORM_LAYOUT_SECTION_TITLE_LENGTH = 200;
export const MAX_FIELDS_PER_ROW = 3;
const MAX_FORM_LAYOUT_TERM_LENGTH = 200;
const MAX_FORM_LAYOUT_ITEMS = 500;

export const formLayoutRowSchema = z.object({
  kind: z.literal('row'),
  terms: z.array(z.string().min(1).max(MAX_FORM_LAYOUT_TERM_LENGTH)).min(1).max(MAX_FIELDS_PER_ROW),
});

export const formLayoutSectionSchema = z.object({
  kind: z.literal('section'),
  title: multilingualTextSchema(true, MAX_FORM_LAYOUT_SECTION_TITLE_LENGTH),
  rows: z.array(formLayoutRowSchema).max(MAX_FORM_LAYOUT_ITEMS),
});

export const formLayoutItemSchema = z.discriminatedUnion('kind', [formLayoutRowSchema, formLayoutSectionSchema]);

export const formLayoutItemsSchema = z.array(formLayoutItemSchema).max(MAX_FORM_LAYOUT_ITEMS);

export type FormLayoutRow = z.infer<typeof formLayoutRowSchema>;
export type FormLayoutSection = { kind: 'section'; title: MultilingualText; rows: FormLayoutRow[] };
export type FormLayoutItem = FormLayoutRow | FormLayoutSection;

// The layout of one project's form, for the annotation page.
export type FormLayoutDto = {
  formName: string;
  items: FormLayoutItem[];
};

// A field of the models behind one form name, as the layout editor lists it. A group of fields
// (an entity) is one field here: it is placed as one block. inProjects counts the projects whose
// model has the field, so the editor can show that copies of a model differ.
export type FormLayoutFieldDto = {
  term: string;
  label: string;
  type: string;
  required: boolean;
  isEntity: boolean;
  inProjects: number;
};

export type FormLayoutFieldsDto = {
  projectCount: number;
  fields: FormLayoutFieldDto[];
};

export type FormLayoutProblem =
  | { kind: 'duplicate-term'; term: string }
  | { kind: 'entity-not-alone'; term: string }
  | { kind: 'missing-required'; term: string; label: string };

/**
 * The rules a layout must follow before it can be saved: every term at most once, a group of
 * fields (entity) alone on its row, and every required field placed. Row size and section titles
 * are checked by formLayoutItemsSchema.
 * @param items the layout's rows and sections (FormSave.layout)
 * @param fields the fields of the models behind the layout's form name (FormLayoutFieldsDto.fields)
 * Returns: the problems found, empty when the layout may be saved.
 */
export function checkFormLayout(items: FormLayoutItem[], fields: FormLayoutFieldDto[]): FormLayoutProblem[] {
  const rows = items.flatMap(item => (item.kind === 'section' ? item.rows : [item]));
  const fieldByTerm = new Map(fields.map(field => [field.term, field]));
  const problems: FormLayoutProblem[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (const term of row.terms) {
      if (seen.has(term)) {
        problems.push({ kind: 'duplicate-term', term });
      }
      seen.add(term);
      if (row.terms.length > 1 && fieldByTerm.get(term)?.isEntity) {
        problems.push({ kind: 'entity-not-alone', term });
      }
    }
  }

  for (const field of fields) {
    if (field.required && !seen.has(field.term)) {
      problems.push({ kind: 'missing-required', term: field.term, label: field.label });
    }
  }

  return problems;
}
