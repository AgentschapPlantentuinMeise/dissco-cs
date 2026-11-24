import { csFetch, csFetchField } from './request';
import { withQuery } from '../url';
import { FormDto, FormLayoutFieldsDto, FormSave } from '@dissco-cs/shared-types';

export const formsApi = {
  /**
   * Every form name in use on this site, with its projects (any status, archived included) and
   * what is stored for it: institution, manual and layout. A stored form whose name no project has
   * any more is listed too, with no projects.
   * Input: none.
   * Who: site admin.
   * Returns: FormDto[], sorted by form name.
   */
  list: () => csFetchField<FormDto[]>('/forms', 'forms'),

  /**
   * The fields of the models behind one form name, merged over its non-archived projects, in the
   * order of the model's structure. A group of fields (entity) is one field; a field is required
   * when it is required in any of the models.
   * @param formName the name exactly as Madoc has it (FormDto.formName)
   * Who: site admin.
   * Returns: FormLayoutFieldsDto (the number of projects and the fields).
   */
  getFields: (formName: string) => csFetch<FormLayoutFieldsDto>(withQuery('/forms/fields', { formName })),

  /**
   * Replaces everything stored for one form; with no template project, institution, manual and
   * layout its row is removed. Every project with this form name picks up the change.
   * @param data formName exactly as Madoc has it (FormDto.formName); templateProjectId, the Madoc
   *   project id of one of the form's own projects (FormProjectDto.id) or null; institutionId and
   *   manualId, each an id or null; layout, rows and sections with a title in every site language,
   *   or null for Madoc's own field order. Validated by formSaveSchema; the server runs
   *   checkFormLayout too.
   * Who: site admin.
   * Returns: nothing (204); 400 when checkFormLayout finds a problem or the template project does
   *   not use this form; 404 when the institution or
   *   manual is not on this site; 409 when the layout is removed while a non-archived project
   *   still uses the form.
   */
  update: (data: FormSave) => csFetch<void>('/forms', { method: 'PUT', body: JSON.stringify(data) }),
};
