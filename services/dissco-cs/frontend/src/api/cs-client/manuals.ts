import { csFetch, csFetchField, csUpload } from './request';
import { urlPath } from '../url';
import { SitePageLang, ManualDto, ManualInput, ManualSummaryDto, ManualDetailDto } from '@dissco-cs/shared-types';

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
   * Creates a manual with its title and text; attachments are uploaded afterwards with its id.
   * @param input title: every language, not empty, max MAX_MANUAL_TITLE_LENGTH (200) characters;
   *   content: Markdown per language, max MAX_MANUAL_CONTENT_LENGTH (200,000), in every language
   *   or in none. `## ` headings become the sections, {{attachment}} places the attachment.
   *   Validated by manualInputSchema.
   * Who: site admin.
   * Returns: the new ManualDto (201).
   */
  create: (input: ManualInput) => csFetch<ManualDto>('/manuals', { method: 'POST', body: JSON.stringify(input) }),

  /**
   * Replaces a manual's title and text in every language; its attachments stay as they are.
   * @param manualId the manual (ManualSummaryDto.id)
   * @param input the same as for create. Validated by manualInputSchema.
   * Who: site admin.
   * Returns: nothing (204); 404 when it is not on this site.
   */
  update: (manualId: number, input: ManualInput) =>
    csFetch<void>(urlPath`/manuals/${manualId}`, { method: 'PUT', body: JSON.stringify(input) }),

  /**
   * Deletes a manual with its attachments and its links to projects.
   * @param manualId the manual (ManualSummaryDto.id)
   * Who: site admin.
   * Returns: nothing (204); 404 when it is not on this site.
   */
  delete: (manualId: number) => csFetch<void>(urlPath`/manuals/${manualId}`, { method: 'DELETE' }),

  /**
   * Uploads (or replaces) the attachment of one language, e.g. a PDF, as multipart form data.
   * @param manualId the manual (ManualSummaryDto.id)
   * @param lang the language (SITE_PAGE_LANGS)
   * @param file max MAX_MANUAL_ATTACHMENT_LENGTH (8 MB)
   * Who: site admin.
   * Returns: nothing (204); 404 unknown manual; 413 file too large.
   */
  uploadAttachment: (manualId: number, lang: SitePageLang, file: File) =>
    csUpload(urlPath`/manuals/${manualId}/${lang}/attachment`, file),

  /**
   * Removes the attachment of one language.
   * @param manualId the manual (ManualSummaryDto.id)
   * @param lang the language (SITE_PAGE_LANGS)
   * Who: site admin.
   * Returns: nothing (204); 404 unknown manual.
   */
  deleteAttachment: (manualId: number, lang: SitePageLang) =>
    csFetch<void>(urlPath`/manuals/${manualId}/${lang}/attachment`, { method: 'DELETE' }),
};
