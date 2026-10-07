import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { tasksApi } from '../api/cs-client/tasks';
import { captureModelsApi } from '../api/cs-client/capture-models';
import { cloneModelDocument } from '../pages/annotate/form/document';
import { MadocCaptureModelDto } from '@dissco-cs/shared-types';
import { ReviewFieldForm } from './ReviewFieldForm';

interface TaskRevisionViewProps {
  taskId: string;
}

// Toont de ingediende data van een afgewerkte taak, alleen-lezen. Gaat bewust niet via
// prepareClaim (zoals AnnotatePage) -- Madoc's eigen getTaskFromClaim sluit taken met
// status 3 ("Accepted") uit als "bestaande claim", waardoor prepare-claim voor precies deze taken
// "Maximum number of contributors reached" teruggeeft. In plaats daarvan hergebruiken we hetzelfde
// ophaal-patroon als de Review-module: taak -> revisie -> capture model, via revisionId.
export function TaskRevisionView({ taskId }: TaskRevisionViewProps) {
  const { t } = useTranslation('dissco-cs');

  const taskQuery = useQuery({ queryKey: ['task-detail', taskId], queryFn: () => tasksApi.get(taskId), enabled: !!taskId });
  const revisionId = taskQuery.data?.state?.revisionId;

  const revisionQuery = useQuery({
    queryKey: ['review-revision', revisionId],
    queryFn: () => captureModelsApi.getRevision(revisionId as string),
    enabled: !!revisionId,
  });
  const modelQuery = useQuery<MadocCaptureModelDto>({
    queryKey: ['capture-model', revisionQuery.data?.captureModelId],
    queryFn: () => captureModelsApi.get(revisionQuery.data!.captureModelId),
    enabled: !!revisionQuery.data?.captureModelId,
  });

  const isLoading = taskQuery.status === 'pending' || (!!revisionId && (revisionQuery.status === 'pending' || modelQuery.status === 'pending'));
  if (isLoading) {
    return <p className="text-sm text-gray-500 px-1 py-3">{t('review_detail_loading')}</p>;
  }

  const model = modelQuery.data;
  const hasError = taskQuery.status === 'error' || !revisionId || revisionQuery.status === 'error' || modelQuery.status === 'error';
  if (hasError || !model) {
    return <p className="text-sm text-red-600 px-1 py-3">{t('review_detail_error')}</p>;
  }

  return (
    <div className="px-1 py-3">
      <ReviewFieldForm model={model} document={cloneModelDocument(model)} readOnly />
    </div>
  );
}
