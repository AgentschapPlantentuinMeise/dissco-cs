import { csFetch } from './request';
import { withSite } from '../url';
import { SiteColors, SiteThemeDto } from '@dissco-cs/shared-types';

export const siteThemeApi = {
  /**
   * The site's own palette and name; each is null when the site uses the default.
   * Input: none.
   * Who: anyone.
   * Returns: SiteThemeDto.
   */
  get: () => csFetch<SiteThemeDto>(withSite('/site-theme')),

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

  /**
   * Saves the site's own name, shown in the browser tab, the logo's alt text and every text that
   * names the platform.
   * @param name max MAX_SITE_NAME_LENGTH (60) characters; empty removes it, so the platform's name
   *   from the config applies again. Validated by siteNameSchema.
   * Who: site admin.
   * Returns: nothing (204).
   */
  setName: (name: string) => csFetch<void>('/site-theme/name', { method: 'PUT', body: JSON.stringify({ name }) }),
};
