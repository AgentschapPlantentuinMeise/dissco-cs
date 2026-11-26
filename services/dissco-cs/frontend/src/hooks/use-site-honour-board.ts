import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { HonourBoardQuarterDto, quarterOf } from '@dissco-cs/shared-types';
import { statsQueries } from '../api/queries/stats';
import { QuarterInfo, quarterTimeline } from '../components/stats/honour-board-timeline';
import { useRefreshPoll } from './use-refresh-poll';
import { failedToLoad, loadState } from '../api/query-state';

export interface HonourBoardQuarter extends QuarterInfo {
  data: HonourBoardQuarterDto | undefined;
  pending: boolean;
  // The quarter could not be loaded and there is no earlier answer to show.
  failed: boolean;
}

// The site's honour board for the running quarter and the three before it: one query per quarter,
// so each quarter shows as soon as its own data is in. Per quarter: one normal fetch when the page opens (the
// backend answers from its cache and recalculates in the background). The running quarter also
// gets a cache-only poll while that recalculation runs, which never starts a recalculation itself.
export function useSiteHonourBoard(): HonourBoardQuarter[] {
  // Fixed while the page is open, so the quarters and their query keys do not shift under it.
  const now = useMemo(() => new Date(), []);
  const timeline = useMemo(() => quarterTimeline(now), [now]);
  const results = useQueries({
    queries: timeline.map(quarter => statsQueries.honourBoard(quarter.key)),
  });
  const running = results[timeline.findIndex(quarter => quarter.kind === 'current')];
  const peek = useQuery({ ...statsQueries.honourBoardCurrent(quarterOf(now)), ...useRefreshPoll(running?.data?.refreshing) });

  return timeline.map((quarter, index) => {
    const data = (quarter.kind === 'current' ? peek.data : undefined) ?? results[index].data;
    return {
      ...quarter,
      data,
      pending: loadState(results[index]) === 'loading',
      failed: !data && failedToLoad(results[index]),
    };
  });
}
