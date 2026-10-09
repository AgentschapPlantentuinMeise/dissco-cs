import { queryOptions } from '@tanstack/react-query';
import { manualsApi } from '../cs-client/manuals';

// The manual library (admin). A project's own manual is projectQueries.manual.
export const manualKeys = {
  all: ['manuals'] as const,
  list: () => [...manualKeys.all, 'list'] as const,
  detail: (manualId: number) => [...manualKeys.all, 'detail', manualId] as const,
};

export const manualQueries = {
  list: () => queryOptions({ queryKey: manualKeys.list(), queryFn: () => manualsApi.list() }),
  detail: (manualId: number) => queryOptions({ queryKey: manualKeys.detail(manualId), queryFn: () => manualsApi.getAdmin(manualId) }),
};
