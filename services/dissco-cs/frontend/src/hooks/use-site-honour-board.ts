import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { HonourBoardQuarterDto, quarterOf } from '@dissco-cs/shared-types';
import { statsQueries } from '../api/queries/stats';
import { QuarterInfo, quarterTimeline } from '../components/stats/honour-board-timeline';
import { usePollingWindow } from './use-polling-window';

export interface HonourBoardQuarter extends QuarterInfo {
  data: HonourBoardQuarterDto | undefined;
  pending: boolean;
  // The quarter could not be loaded and there is no earlier answer to show.
  failed: boolean;
}

// The site's honour board for the running quarter and the three before it: one query per quarter,
// so each quarter shows as soon as its own data is in. Per quarter: one normal fetch when the page opens (the
// backend answers from its cache and recalculates in the background). The running quarter also
// gets a cache-only poll every 15 s during the first 2 minutes, which never starts a
// recalculation. refetchOnWindowFocus is off on the normal fetch, so switching browser tabs does
// not start database queries.
export function useSiteHonourBoard(): HonourBoardQuarter[] {
  // Fixed while the page is open, so the quarters and their query keys do not shift under it.
  const now = useMemo(() => new Date(), []);
  const timeline = useMemo(() => quarterTimeline(now), [now]);
  const refetchInterval = usePollingWindow();

  const results = useQueries({
    queries: timeline.map(quarter => ({
      ...statsQueries.honourBoard(quarter.key),
      refetchOnWindowFocus: false,
    })),
  });
  const peek = useQuery({ ...statsQueries.honourBoardCurrent(quarterOf(now)), refetchInterval });

  return timeline.map((quarter, index) => {
    const data = (quarter.kind === 'current' ? peek.data : undefined) ?? results[index].data;
    return {
      ...quarter,
      data,
      pending: results[index].status === 'pending',
      failed: !data && results[index].status === 'error',
    };
  });
}
