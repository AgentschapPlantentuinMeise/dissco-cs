import { queryOptions } from '@tanstack/react-query';
import { captureModelsApi } from '../cs-client/capture-models';
import { FROZEN_UNTIL_LEFT } from './freshness';

export const captureModelKeys = {
  all: ['capture-models'] as const,
  model: (modelId: string | undefined) => [...captureModelKeys.all, 'model', modelId] as const,
  revision: (revisionId: string | undefined) => [...captureModelKeys.all, 'revision', revisionId] as const,
};

export const captureModelQueries = {
  // The annotate page builds its form from this model (use-annotation-document). After a save the
  // model in Madoc holds the saved values, so a refetch (e.g. on returning to the browser tab)
  // brought a changed model and the form was set up again, empty, while the volunteer was working.
  // So it never refetches on its own (staleTime Infinity), and it is dropped from the cache as soon
  // as nobody shows it (gcTime 0), so opening the task again still loads it afresh.
  model: (modelId: string | undefined) =>
    queryOptions({
      queryKey: captureModelKeys.model(modelId),
      queryFn: () => captureModelsApi.get(modelId!),
      enabled: !!modelId,
      ...FROZEN_UNTIL_LEFT,
    }),

  revision: (revisionId: string | undefined) =>
    queryOptions({
      queryKey: captureModelKeys.revision(revisionId),
      queryFn: () => captureModelsApi.getRevision(revisionId!),
      enabled: !!revisionId,
    }),
};
