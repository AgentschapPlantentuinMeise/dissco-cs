import { z } from 'zod';

// How a site uses the quarter pool: with a thank-you that a jury hands to one volunteer from the
// pool ('prize'), as recognition only, without a jury or a winner ('recognition'), or not at all
// ('off': no band on the pages). Not every institution can or wants to hand out prizes.
export const HONOUR_BOARD_MODES = ['prize', 'recognition', 'off'] as const;
export type HonourBoardMode = (typeof HONOUR_BOARD_MODES)[number];

export const MAX_HONOUR_BOARD_THRESHOLD = 1000;

// One threshold for the whole site. A site without settings of its own uses 'prize' and
// HONOUR_BOARD_DEFAULT_THRESHOLD.
export interface HonourBoardSettingsDto {
  mode: HonourBoardMode;
  threshold: number;
}

export const honourBoardSettingsSchema = z.strictObject({
  mode: z.enum(HONOUR_BOARD_MODES),
  threshold: z.number().int().min(1).max(MAX_HONOUR_BOARD_THRESHOLD),
});
