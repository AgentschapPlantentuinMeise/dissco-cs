import { queryOptions } from '@tanstack/react-query';
import { captureModelsApi } from '../cs-client/capture-models';

export const captureModelKeys = {
  all: ['capture-models'] as const,
  model: (modelId: string | undefined) => [...captureModelKeys.all, 'model', modelId] as const,
  revision: (revisionId: string | undefined) => [...captureModelKeys.all, 'revision', revisionId] as const,
};

export const captureModelQueries = {
  model: (modelId: string | undefined) =>
    queryOptions({ queryKey: captureModelKeys.model(modelId), queryFn: () => captureModelsApi.get(modelId!), enabled: !!modelId }),

  revision: (revisionId: string | undefined) =>
    queryOptions({
      queryKey: captureModelKeys.revision(revisionId),
      queryFn: () => captureModelsApi.getRevision(revisionId!),
      enabled: !!revisionId,
    }),
};
