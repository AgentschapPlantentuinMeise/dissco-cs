import { csFetch, csFetchField } from './request';
import { withSite } from '../url';
import { SiteColors } from '@dissco-cs/shared-types';

export const siteThemeApi = {
  /**
   * The site's own palette, or null when the site uses the default colors.
   * Input: none.
   * Who: anyone.
   * Returns: SiteColors | null.
   */
  get: () => csFetchField<SiteColors | null>(withSite('/site-theme'), 'colors'),

  /**
   * Saves the site's own palette; every page picks it up on its next load of the theme.
   * @param colors all five brand colors as '#rrggbb'. Validated by siteColorsSchema.
   * Who: site admin.
   * Returns: nothing (204).
   */
  setColors: (colors: SiteColors) =>
    csFetch<void>('/site-theme/colors', { method: 'PUT', body: JSON.stringify(colors) }),

  /**
   * Removes the site's own palette, so the default colors apply again.
   * Input: none.
   * Who: site admin.
   * Returns: nothing (204).
   */
  deleteColors: () => csFetch<void>('/site-theme/colors', { method: 'DELETE' }),
};
