import { ApiError, csFetch } from './request';
import { getJwt, redirectToExpiredLogin } from '../jwt';
import { SitePageLang, ManualDto, ManualSummaryDto, ManualDetailDto } from '@dissco-cs/shared-types';

// The manual library of the management page. A project's own manual (reading it, linking it) is
// in projectsApi.
export const manualsApi = {
  /**
   * One manual with its title and text per language, and which languages have an attachment.
   * @param manualId the manual (ManualSummaryDto.id)
   * Who: site admin.
   * Returns: ManualDetailDto; 404 when it is not on this site.
   */
  getAdmin: (manualId: number) => csFetch<ManualDetailDto>(`/manuals/${manualId}`),

  /**
   * Every manual of this site, with the projects it is linked to.
   * Input: none.
   * Who: site admin.
   * Returns: { manuals: ManualSummaryDto[] }.
   */
  list: () => csFetch<{ manuals: ManualSummaryDto[] }>('/manuals'),

  /**
   * Creates an empty manual with a title in one language.
   * @param lang the language of the title (SITE_PAGE_LANGS)
   * @param title not empty, max MAX_MANUAL_TITLE_LENGTH (200) characters.
   *   Validated by setManualTitleSchema.
   * Who: site admin.
   * Returns: the new ManualDto (201).
   */
  create: (lang: SitePageLang, title: string) =>
    csFetch<ManualDto>('/manuals', { method: 'POST', body: JSON.stringify({ lang, title }) }),

  /**
   * Deletes a manual with its attachments and its links to projects.
   * @param manualId the manual (ManualSummaryDto.id)
   * Who: site admin.
   * Returns: nothing (204); 404 when it is not on this site.
   */
  remove: (manualId: number) => csFetch<void>(`/manuals/${manualId}`, { method: 'DELETE' }),

  /**
   * Saves the manual's text in one language.
   * @param manualId the manual (ManualSummaryDto.id)
   * @param lang the language (SITE_PAGE_LANGS)
   * @param content Markdown, max MAX_MANUAL_CONTENT_LENGTH (200,000) characters; empty is allowed.
   *   `## ` headings become the sections, {{attachment}} places the attachment.
   *   Validated by setManualContentSchema.
   * Who: site admin.
   * Returns: nothing (204); 404 when it is not on this site.
   */
  setContent: (manualId: number, lang: SitePageLang, content: string) =>
    csFetch<void>(`/manuals/${manualId}/${lang}`, { method: 'PUT', body: JSON.stringify({ content }) }),

  /**
   * Uploads (or replaces) the attachment of one language, e.g. a PDF. Sent as multipart form
   * data, hence its own fetch instead of csFetch.
   * @param manualId the manual (ManualSummaryDto.id)
   * @param lang the language (SITE_PAGE_LANGS)
   * @param file max MAX_MANUAL_ATTACHMENT_LENGTH (8 MB)
   * Who: site admin.
   * Returns: nothing (204); 404 unknown manual; 413 file too large.
   */
  uploadAttachment: async (manualId: number, lang: SitePageLang, file: File): Promise<void> => {
    const jwt = getJwt();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/dissco-cs/manuals/${manualId}/${lang}/attachment`, {
      method: 'PUT',
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
      body: formData,
    });

    if (response.status === 401) {
      return redirectToExpiredLogin<void>();
    }

    if (!response.ok) {
      const path = `/manuals/${manualId}/${lang}/attachment`;
      throw new ApiError(response.status, path, (await response.text().catch(() => '')) || undefined);
    }
  },

  /**
   * Removes the attachment of one language.
   * @param manualId the manual (ManualSummaryDto.id)
   * @param lang the language (SITE_PAGE_LANGS)
   * Who: site admin.
   * Returns: nothing (204); 404 unknown manual.
   */
  deleteAttachment: (manualId: number, lang: SitePageLang) =>
    csFetch<void>(`/manuals/${manualId}/${lang}/attachment`, { method: 'DELETE' }),
};
