export type SiteStatsDto = {
  volunteers: number;
  tasksCompleted: number;
  tasksTotal: number;
};

export type InstitutionStatsDto = {
  volunteers: number;
  tasksCompleted: number;
  tasksTotal: number;
  projectsActive: number;
  projectsCompleted: number;
};

export type HonourBoardPeriodKey = 'today' | 'week' | 'month' | 'legend';
export const HONOUR_BOARD_PERIODS: HonourBoardPeriodKey[] = ['today', 'week', 'month', 'legend'];

// Always ranked on the wire -- every entry in a HonourBoardPeriodDto's `top`/`you` has a `rank`.
export type HonourBoardEntryDto = { userUrn: string; name: string; count: number; rank: number };
export type HonourBoardPeriodDto = { top: HonourBoardEntryDto[]; you: HonourBoardEntryDto | null };
