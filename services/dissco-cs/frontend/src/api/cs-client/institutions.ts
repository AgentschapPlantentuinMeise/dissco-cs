import { csFetch, csFetchField, csSendForm } from './request';
import { urlPath, withSite } from '../url';
import { INSTITUTION_LOGO_FIELD, InstitutionDto, InstitutionInput } from '@dissco-cs/shared-types';

// The fields as JSON in the field "data", a new logo in its own file field.
function institutionForm(input: InstitutionInput, logo: File | null): FormData {
  const form = new FormData();
  form.append('data', JSON.stringify(input));
  if (logo) {
    form.append(INSTITUTION_LOGO_FIELD, logo);
  }
  return form;
}

export const institutionsApi = {
  /**
   * Builds the URL of an institution's logo -- no request is made.
   * @param institution the institution (InstitutionDto); its logoUpdatedAt goes in the URL, so a new
   *   logo gets a new URL and the browser may cache each one for good
   * Returns: the URL, or null when the institution has no logo.
   */
  logoUrl: ({ id, logoUpdatedAt }: InstitutionDto) =>
    logoUpdatedAt ? withSite(urlPath`/api/dissco-cs/institutions/${id}/logo`, { v: logoUpdatedAt }) : null,

  /**
   * The active institutions of this site, in their set order -- for the public pages.
   * Input: none.
   * Who: anyone.
   * Returns: InstitutionDto[].
   */
  listActive: () => csFetchField<InstitutionDto[]>(withSite('/institutions/active'), 'institutions'),

  /**
   * One active institution.
   * @param slug the institution's slug (InstitutionDto.slug), from the URL
   * Who: anyone.
   * Returns: InstitutionDto; 404 when it does not exist or is inactive.
   */
  getActive: (slug: string) => csFetch<InstitutionDto>(withSite(urlPath`/institutions/active/${slug}`)),

  /**
   * Slugs of the projects linked to an active institution.
   * @param slug the institution's slug (InstitutionDto.slug)
   * Who: anyone.
   * Returns: string[]; 404 when the institution does not exist or is inactive.
   */
  listActiveProjectSlugs: (slug: string) =>
    csFetchField<string[]>(withSite(urlPath`/institutions/active/${slug}/projects`), 'projectSlugs'),

  /**
   * Every institution of this site, active or not -- for the management page.
   * Input: none.
   * Who: site admin.
   * Returns: InstitutionDto[].
   */
  listAdmin: () => csFetchField<InstitutionDto[]>('/institutions', 'institutions'),

  /**
   * Creates an institution with its logo; its slug is made from the name (first filled language)
   * and kept unique.
   * @param data name (max MAX_INSTITUTION_NAME_LENGTH) and description (max
   *   MAX_INSTITUTION_DESCRIPTION_LENGTH) filled in every language; email; phone (at least 6
   *   digits); website; isActive. Validated by institutionInputSchema.
   * @param logo jpeg, png or webp, max MAX_IMAGE_UPLOAD_SIZE (3 MB). Checked by imageFileSchema;
   *   the server checks the type again from the file's content.
   * Who: site admin.
   * Returns: the new InstitutionDto (201); 400 invalid fields or no logo; 413 logo too large;
   *   415 not an accepted image type.
   */
  create: (data: InstitutionInput, logo: File) =>
    csSendForm<InstitutionDto>('/institutions', 'POST', institutionForm(data, logo)),

  /**
   * Replaces an institution completely; the slug follows the (new) name.
   * @param id the institution (InstitutionDto.id)
   * @param data the full institution, same fields and rules as create
   * @param logo a new logo (same rules as create), or null to keep the stored one
   * Who: site admin.
   * Returns: nothing (204); 404 when it is not on this site; 400 also when it has no logo yet and
   *   none is sent; 413/415 like create.
   */
  update: (id: InstitutionDto['id'], data: InstitutionInput, logo: File | null) =>
    csSendForm<void>(urlPath`/institutions/${id}`, 'PUT', institutionForm(data, logo)),

  /**
   * Deletes an institution.
   * @param id the institution (InstitutionDto.id)
   * Who: site admin.
   * Returns: nothing (204); 404 when it is not on this site.
   */
  delete: (id: InstitutionDto['id']) => csFetch<void>(urlPath`/institutions/${id}`, { method: 'DELETE' }),
};
