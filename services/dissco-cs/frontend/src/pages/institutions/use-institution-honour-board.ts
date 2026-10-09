import { useHonourBoardPeriods } from '../../hooks/use-honour-board-periods';

// Waits for the slug instead of falling back to site-wide numbers while it's still unknown.
export function useInstitutionHonourBoard(slug: string | undefined) {
  return useHonourBoardPeriods(slug, !!slug);
}
