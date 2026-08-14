import React from 'react';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { madocClient } from '../api/madoc-client';
import { cloneModelDocument } from '../pages/annotate/form/document';
import { CaptureModel } from '../capture-model/types/capture-model';
import { ReviewFieldForm } from './ReviewFieldForm';

interface TaskRevisionViewProps {
  taskId: string;
}

// Toont de ingediende data van een afgewerkte taak, alleen-lezen. Gaat bewust niet via
// madocClient.prepareClaim (zoals AnnotatePage) -- Madoc's eigen getTaskFromClaim sluit taken met
// status 3 ("Accepted") uit als "bestaande claim", waardoor prepare-claim voor precies deze taken
// "Maximum number of contributors reached" teruggeeft. In plaats daarvan hergebruiken we hetzelfde
// ophaal-patroon als de Review-module: taak -> revisie -> capture model, via revisionId.
export function TaskRevisionView({ taskId }: TaskRevisionViewProps) {
  const { t } = useTranslation('dissco-cs');

  const taskQuery = useQuery(['task-detail', taskId], () => madocClient.getTaskById(taskId), { enabled: !!taskId });
  const revisionId = taskQuery.data?.state?.revisionId;

  const revisionQuery = useQuery(
    ['review-revision', revisionId],
    () => madocClient.getCaptureModelRevision(revisionId as string),
    { enabled: !!revisionId }
  );
  const modelQuery = useQuery<CaptureModel>(
    ['capture-model', revisionQuery.data?.captureModelId],
    () => madocClient.getCaptureModel(revisionQuery.data.captureModelId),
    { enabled: !!revisionQuery.data?.captureModelId }
  );

  const isLoading = taskQuery.status === 'loading' || (!!revisionId && (revisionQuery.status === 'loading' || modelQuery.status === 'loading'));
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
