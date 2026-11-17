import { queryOptions } from '@tanstack/react-query';
import { HonourBoardQuarterKey } from '@dissco-cs/shared-types';
import { honourBoardQuartersApi } from '../cs-client/honour-board-quarters';

export const honourBoardQuarterKeys = {
  all: ['honour-board-quarters'] as const,
  detail: (quarter: HonourBoardQuarterKey) => [...honourBoardQuarterKeys.all, quarter] as const,
};

export const honourBoardQuarterQueries = {
  detail: (quarter: HonourBoardQuarterKey) =>
    queryOptions({ queryKey: honourBoardQuarterKeys.detail(quarter), queryFn: () => honourBoardQuartersApi.get(quarter) }),
};
