import { useQuery } from 'react-query';
import { institutionsApi } from '../api/cs-api';
import { usePollingWindow } from './use-polling-window';

// Same pattern as use-honour-board.ts, scoped to one institution's projects.
export function useInstitutionHonourBoard(slug: string | undefined) {
  const initial = useQuery(['institution-honour-board', slug], () => institutionsApi.getHonourBoard(slug!), {
    enabled: !!slug,
    refetchOnWindowFocus: false,
    // TODO: temporary for diagnosis, remove once the cause of the honour-board errors is found.
    onError: err => console.error('[institution-honour-board] initial fetch failed', slug, err),
  });
  const refetchInterval = usePollingWindow();
  const peek = useQuery(['institution-honour-board-current', slug], () => institutionsApi.getHonourBoardCurrent(slug!), {
    enabled: !!slug,
    refetchInterval,
    onError: err => console.error('[institution-honour-board] peek fetch failed', slug, err),
  });

  return { ...initial, data: peek.data ?? initial.data };
}
