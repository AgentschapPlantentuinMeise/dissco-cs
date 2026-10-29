import { csFetch, csFetchField, csSendForm } from './request';
import { urlPath, withSite } from '../url';
import { SiteImageDto, SiteImageKey } from '@dissco-cs/shared-types';

export const siteImagesApi = {
  /**
   * Which site images are set (the logo, the header photos), with their credit.
   * Input: none.
   * Who: anyone.
   * Returns: SiteImageDto[]; an image that is not set is not in the list.
   */
  list: () => csFetchField<SiteImageDto[]>(withSite('/site-images'), 'images'),

  /**
   * Builds the URL of a site image -- no request is made.
   * @param key which image (SITE_IMAGE_KEYS)
   * @param updatedAt SiteImageDto.updatedAt: a new image gets a new URL, so the browser may cache
   *   each one for good.
   * Returns: the URL; fetching it gives the image, or 404 when it is not set.
   */
  fileUrl: (key: SiteImageKey, updatedAt: string) =>
    withSite(urlPath`/api/dissco-cs/site-images/${key}`, { v: updatedAt }),

  /**
   * Uploads (or replaces) a site image, keeping its credit.
   * @param key which image (SITE_IMAGE_KEYS)
   * @param file jpeg, png or webp, max MAX_IMAGE_UPLOAD_SIZE (3 MB). Checked by imageFileSchema;
   *   the server checks the type again from the file's content.
   * Who: site admin.
   * Returns: nothing (204); 413 file too large; 415 not an accepted image type.
   */
  uploadFile: (key: SiteImageKey, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return csSendForm<void>(urlPath`/site-images/${key}/file`, 'PUT', form);
  },

  /**
   * Sets the credit shown in the corner of a header photo.
   * @param key which image (SITE_IMAGE_KEYS)
   * @param credit the credit, or null (an empty text also counts as none). Validated by
   *   setSiteImageCreditSchema.
   * Who: site admin.
   * Returns: nothing (204); 404 when the image is not set.
   */
  setCredit: (key: SiteImageKey, credit: string | null) =>
    csFetch<void>(urlPath`/site-images/${key}/credit`, { method: 'PATCH', body: JSON.stringify({ credit }) }),

  /**
   * Removes a site image and its credit; its place falls back to the default.
   * @param key which image (SITE_IMAGE_KEYS)
   * Who: site admin.
   * Returns: nothing (204).
   */
  deleteFile: (key: SiteImageKey) => csFetch<void>(urlPath`/site-images/${key}/file`, { method: 'DELETE' }),
};
