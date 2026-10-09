import { queryOptions } from '@tanstack/react-query';
import { iiifApi } from '../cs-client/iiif';

export const iiifKeys = {
  all: ['iiif'] as const,
  canvas: (canvasId: number | undefined) => [...iiifKeys.all, 'canvas', canvasId] as const,
  manifestStructure: (manifestId: number | undefined) => [...iiifKeys.all, 'manifest-structure', manifestId] as const,
  collections: () => [...iiifKeys.all, 'collections'] as const,
};

export const iiifQueries = {
  canvas: (canvasId: number | undefined) =>
    queryOptions({ queryKey: iiifKeys.canvas(canvasId), queryFn: () => iiifApi.getCanvas(canvasId!), enabled: !!canvasId }),

  manifestStructure: (manifestId: number | undefined) =>
    queryOptions({
      queryKey: iiifKeys.manifestStructure(manifestId),
      queryFn: () => iiifApi.getManifestStructure(manifestId!),
      enabled: !!manifestId,
    }),

  collections: () => queryOptions({ queryKey: iiifKeys.collections(), queryFn: () => iiifApi.listCollections() }),
};
