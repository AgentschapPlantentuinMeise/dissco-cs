export type HonourBoardPeriodKey = 'today' | 'week' | 'month' | 'legend';
export const HONOUR_BOARD_PERIODS: HonourBoardPeriodKey[] = ['today', 'week', 'month', 'legend'];

// Always ranked on the wire -- every entry in a HonourBoardPeriod's `top`/`you` has a `rank`.
export type HonourBoardEntry = { userUrn: string; name: string; count: number; rank: number };
export type HonourBoardPeriod = { top: HonourBoardEntry[]; you: HonourBoardEntry | null };
