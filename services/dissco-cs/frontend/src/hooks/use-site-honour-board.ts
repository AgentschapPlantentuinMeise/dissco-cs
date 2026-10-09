import { useHonourBoardPeriods } from './use-honour-board-periods';

export function useSiteHonourBoard() {
  return useHonourBoardPeriods(undefined, true);
}
