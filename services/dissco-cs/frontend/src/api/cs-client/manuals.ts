import { csFetch, csFetchField, csSendForm } from './request';
import { urlPath } from '../url';
import {
  ManualDetailDto,
  ManualDto,
  ManualSave,
  ManualSummaryDto,
  SITE_PAGE_LANGS,
  SitePageLang,
  manualAttachmentField,
} from '@dissco-cs/shared-types';

// The text as JSON in the field "data", each new attachment in its own file field.
function manualForm(input: ManualSave, files: Partial<Record<SitePageLang, File>>): FormData {
  const form = new FormData();
  form.append('data', JSON.stringify(input));
  for (const lang of SITE_PAGE_LANGS) {
    const file = files[lang];
    if (file) {
      form.append(manualAttachmentField(lang), file);
    }
  }
  return form;
}

// The manual library of the management page. A project's own manual (reading it, linking it) is
// in projectsApi.
export const manualsApi = {
  /**
   * One manual with its title and text per language, and which languages have an attachment.
   * @param manualId the manual (ManualSummaryDto.id)
   * Who: site admin.
   * Returns: ManualDetailDto; 404 when it is not on this site.
   */
  get: (manualId: number) => csFetch<ManualDetailDto>(urlPath`/manuals/${manualId}`),

  /**
   * Every manual of this site, with the projects it is linked to.
   * Input: none.
   * Who: site admin.
   * Returns: ManualSummaryDto[].
   */
  list: () => csFetchField<ManualSummaryDto[]>('/manuals', 'manuals'),

  /**
   * Creates a manual with its text and attachments in one request: everything is saved, or
   * nothing is.
   * @param input title: every language, not empty, max MAX_MANUAL_TITLE_LENGTH (200) characters;
   *   content: Markdown per language, max MAX_MANUAL_CONTENT_LENGTH (200,000), in every language
   *   or in none. `## ` headings become the sections, {{attachment}} places the attachment.
   *   removeAttachments: [] for a new manual. Validated by manualSaveSchema.
   * @param files per language a PDF (MANUAL_ATTACHMENT_MIME_TYPES), max MAX_MANUAL_ATTACHMENT_LENGTH
   *   (8 MB) each. The server checks the type from the file's content, not from file.type. Text and
   *   attachments together follow checkManualContent.
   * Who: site admin.
   * Returns: the new ManualDto (201); 400 invalid text or content rule broken; 413 a file too
   *   large; 415 a file that is not a PDF.
   */
  create: (input: ManualSave, files: Partial<Record<SitePageLang, File>>) =>
    csSendForm<ManualDto>('/manuals', 'POST', manualForm(input, files)),

  /**
   * Replaces a manual's title and text in every language and changes its attachments, in one
   * request: everything is saved, or nothing is.
   * @param manualId the manual (ManualSummaryDto.id)
   * @param input as for create; removeAttachments: the languages whose stored attachment goes.
   *   Validated by manualSaveSchema.
   * @param files new attachments, as for create; a language with a new file keeps no old one.
   * Who: site admin.
   * Returns: nothing (204); 404 when it is not on this site; 400, 413, 415 as for create.
   */
  update: (manualId: number, input: ManualSave, files: Partial<Record<SitePageLang, File>>) =>
    csSendForm<void>(urlPath`/manuals/${manualId}`, 'PUT', manualForm(input, files)),

  /**
   * Deletes a manual with its attachments and its links to projects.
   * @param manualId the manual (ManualSummaryDto.id)
   * Who: site admin.
   * Returns: nothing (204); 404 when it is not on this site.
   */
  delete: (manualId: number) => csFetch<void>(urlPath`/manuals/${manualId}`, { method: 'DELETE' }),
};
