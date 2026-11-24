import { Pool } from 'pg';
import { fromBigint } from '../database/bigint.js';
import { FormDto, FormLayoutDto, FormLayoutItem, FormSave } from '@dissco-cs/shared-types';

export type FormRow = {
  site_id: number;
  form_name: string;
  template_project_id: number | null;
  institution_id: string | null;
  manual_id: string | null;
  layout_items: FormLayoutItem[] | null;
  updated_at: Date;
  updated_by: number;
};

// What is stored per Madoc form name: its institution, manual and layout. A project gets them
// through its form name, so a project copied from a template has them without being linked itself.
export class FormsRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string
  ) {}

  private table(name: string): string {
    return `${this.schemaRef}.${name}`;
  }

  async listForms(siteId: number): Promise<FormRow[]> {
    const result = await this.pool.query<FormRow>(`SELECT * FROM ${this.table('forms')} WHERE site_id = $1 ORDER BY form_name`, [siteId]);

    return result.rows;
  }

  async getForm(siteId: number, formName: string): Promise<FormRow | null> {
    const result = await this.pool.query<FormRow>(`SELECT * FROM ${this.table('forms')} WHERE site_id = $1 AND form_name = $2`, [
      siteId,
      formName,
    ]);

    return result.rows[0] ?? null;
  }

  // A form with no template project, institution, manual or layout has no row, so a form that was
  // renamed in Madoc leaves the admin list once it is emptied.
  async saveForm(siteId: number, userId: number, input: FormSave): Promise<void> {
    if (input.templateProjectId === null && input.institutionId === null && input.manualId === null && input.layout === null) {
      await this.pool.query(`DELETE FROM ${this.table('forms')} WHERE site_id = $1 AND form_name = $2`, [siteId, input.formName]);
      return;
    }

    await this.pool.query(
      `
      INSERT INTO ${this.table('forms')} (site_id, form_name, template_project_id, institution_id, manual_id, layout_items, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (site_id, form_name) DO UPDATE
      SET template_project_id = EXCLUDED.template_project_id, institution_id = EXCLUDED.institution_id,
          manual_id = EXCLUDED.manual_id, layout_items = EXCLUDED.layout_items,
          updated_at = NOW(), updated_by = EXCLUDED.updated_by
    `,
      [
        siteId,
        input.formName,
        input.templateProjectId,
        input.institutionId,
        input.manualId,
        input.layout === null ? null : JSON.stringify(input.layout),
        userId,
      ]
    );
  }
}

// ---- DTO mapping ----

// Without the projects: those come from Madoc (see groupProjectsByFormName).
export function toStoredFormDto(row: FormRow): Omit<FormDto, 'projects'> {
  return {
    formName: row.form_name,
    templateProjectId: row.template_project_id,
    institutionId: row.institution_id === null ? null : fromBigint(row.institution_id),
    manualId: row.manual_id === null ? null : fromBigint(row.manual_id),
    layout: row.layout_items,
  };
}

// Null when the form has no layout of its own.
export function toFormLayoutDto(row: FormRow): FormLayoutDto | null {
  return row.layout_items === null ? null : { formName: row.form_name, items: row.layout_items };
}
