import { queryOptions } from '@tanstack/react-query';
import { iiifApi } from '../cs-client/iiif';
import { FIXED_PER_ID, STATIC } from './freshness';

export const iiifKeys = {
  all: ['iiif'] as const,
  canvas: (canvasId: number | undefined) => [...iiifKeys.all, 'canvas', canvasId] as const,
  manifestStructure: (manifestId: number | undefined) => [...iiifKeys.all, 'manifest-structure', manifestId] as const,
  manifestMetadata: (manifestId: number | undefined) => [...iiifKeys.all, 'manifest-metadata', manifestId] as const,
  collections: () => [...iiifKeys.all, 'collections'] as const,
};

export const iiifQueries = {
  canvas: (canvasId: number | undefined) =>
    queryOptions({ queryKey: iiifKeys.canvas(canvasId), queryFn: () => iiifApi.getCanvas(canvasId!), enabled: !!canvasId, ...FIXED_PER_ID }),

  manifestStructure: (manifestId: number | undefined) =>
    queryOptions({
      queryKey: iiifKeys.manifestStructure(manifestId),
      queryFn: () => iiifApi.getManifestStructure(manifestId!),
      enabled: !!manifestId,
      ...FIXED_PER_ID,
    }),

  manifestMetadata: (manifestId: number | undefined) =>
    queryOptions({
      queryKey: iiifKeys.manifestMetadata(manifestId),
      queryFn: () => iiifApi.getManifestMetadata(manifestId!),
      enabled: !!manifestId,
      ...FIXED_PER_ID,
    }),

  collections: () => queryOptions({ queryKey: iiifKeys.collections(), queryFn: () => iiifApi.listCollections(), ...STATIC }),
};
