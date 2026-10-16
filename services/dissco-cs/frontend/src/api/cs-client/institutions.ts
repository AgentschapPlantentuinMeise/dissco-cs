import { csFetch, csFetchField } from './request';
import { urlPath, withSite } from '../url';
import { InstitutionDto, InstitutionInput } from '@dissco-cs/shared-types';

export const institutionsApi = {
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
   * Creates an institution; its slug is made from the name (first filled language) and kept unique.
   * @param data name and description filled in every language; email; phone (at least 6 digits);
   *   website; logo as an image data URI; isActive. Validated by institutionInputSchema.
   * Who: site admin.
   * Returns: the new InstitutionDto (201).
   */
  create: (data: InstitutionInput) =>
    csFetch<InstitutionDto>('/institutions', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Replaces an institution completely; the slug follows the (new) name.
   * @param id the institution (InstitutionDto.id)
   * @param data the full institution, same fields and rules as create
   * Who: site admin.
   * Returns: nothing (204); 404 when it is not on this site.
   */
  update: (id: InstitutionDto['id'], data: InstitutionInput) =>
    csFetch<void>(urlPath`/institutions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /**
   * Deletes an institution.
   * @param id the institution (InstitutionDto.id)
   * Who: site admin.
   * Returns: nothing (204); 404 when it is not on this site.
   */
  delete: (id: InstitutionDto['id']) => csFetch<void>(urlPath`/institutions/${id}`, { method: 'DELETE' }),
};
