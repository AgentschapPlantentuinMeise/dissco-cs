import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HonourBoardPrizeDto, HonourBoardQuarterKey, HonourBoardSettingsDto, quarterOf, quartersUpTo } from '@dissco-cs/shared-types';
import { siteSettingsApi } from '../../../api/cs-client/site-settings';
import { honourBoardQuartersApi } from '../../../api/cs-client/honour-board-quarters';
import { siteSettingsKeys, siteSettingsQueries } from '../../../api/queries/site-settings';
import { honourBoardQuarterKeys, honourBoardQuarterQueries } from '../../../api/queries/honour-board-quarters';
import { statsKeys } from '../../../api/queries/stats';

// The running quarter and the four before it: in January the winner of last year's Q4 can still be chosen.
const QUARTERS_IN_MANAGEMENT = 5;

// The quarter pool's settings and the quarters shown in management, newest first. Every write also
// refreshes the band on the public pages (statsKeys), which reads the same settings and quarters.
export function useHonourBoardManagement() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery(siteSettingsQueries.honourBoard());
  const quarters = useMemo(() => quartersUpTo(quarterOf(new Date()), QUARTERS_IN_MANAGEMENT).reverse(), []);

  const saveSettings = useMutation({
    mutationFn: (settings: HonourBoardSettingsDto) => siteSettingsApi.setHonourBoard(settings),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: siteSettingsKeys.all }),
        queryClient.invalidateQueries({ queryKey: honourBoardQuarterKeys.all }),
        queryClient.invalidateQueries({ queryKey: statsKeys.all }),
      ]);
    },
  });

  return { settingsQuery, saveSettings, quarters };
}

// One quarter in management: its pool, its thank-you and its winner.
export function useQuarterManagement(quarter: HonourBoardQuarterKey) {
  const queryClient = useQueryClient();
  const quarterQuery = useQuery(honourBoardQuarterQueries.detail(quarter));

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: honourBoardQuarterKeys.detail(quarter) }),
      queryClient.invalidateQueries({ queryKey: statsKeys.all }),
    ]);

  const savePrize = useMutation({
    mutationFn: (prize: HonourBoardPrizeDto) => honourBoardQuartersApi.setPrize(quarter, prize),
    onSuccess: refresh,
  });
  const deletePrize = useMutation({
    mutationFn: () => honourBoardQuartersApi.deletePrize(quarter),
    onSuccess: refresh,
  });
  const chooseWinner = useMutation({
    mutationFn: (userUrn: string) => honourBoardQuartersApi.setWinner(quarter, userUrn),
    onSuccess: refresh,
  });

  return { quarterQuery, savePrize, deletePrize, chooseWinner };
}
