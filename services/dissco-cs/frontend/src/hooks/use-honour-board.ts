import { useQuery } from 'react-query';
import { honourBoardApi } from '../api/cs-api';

// One triggering fetch on page load (starts a background recompute if the cache is stale) plus
// a separate, side-effect-free poll every 15s that only reads whatever the cache currently holds
// -- the poll itself must never cause a recompute, so it hits a different, pure-read endpoint.
export function useHonourBoard() {
  const initial = useQuery('honour-board', () => honourBoardApi.get());
  const peek = useQuery('honour-board-current', () => honourBoardApi.getCurrent(), { refetchInterval: 15 * 1000 });

  return { ...initial, data: peek.data ?? initial.data };
}
