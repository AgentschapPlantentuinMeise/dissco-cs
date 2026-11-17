import { csFetch } from './request';
import { HonourBoardSettingsDto } from '@dissco-cs/shared-types';

export const siteSettingsApi = {
  /**
   * The site's quarter pool settings: its mode and its threshold.
   * Input: none.
   * Who: site admin.
   * Returns: HonourBoardSettingsDto; the defaults ('prize', 25) for a site that set nothing.
   */
  getHonourBoard: () => csFetch<HonourBoardSettingsDto>('/site-settings/honour-board'),

  /**
   * Sets the site's quarter pool mode and threshold. Past quarters without a chosen winner are
   * counted again with the new threshold; a quarter with a winner keeps its frozen pool.
   * @param settings mode ('prize', 'recognition' or 'off') and threshold (1 to
   *   MAX_HONOUR_BOARD_THRESHOLD). Validated by honourBoardSettingsSchema.
   * Who: site admin.
   * Returns: nothing (204).
   */
  setHonourBoard: (settings: HonourBoardSettingsDto) =>
    csFetch<void>('/site-settings/honour-board', { method: 'PUT', body: JSON.stringify(settings) }),
};
