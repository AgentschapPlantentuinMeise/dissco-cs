import { useQuery } from '@tanstack/react-query';
import { taskQueries } from '../../api/queries/tasks';
import { captureModelQueries } from '../../api/queries/capture-models';
import { useTranslation } from 'react-i18next';
import { cloneModelDocument } from '../../utility/annotation-document';
import { SubmissionFieldsForm } from '../../components/capture-models/SubmissionFieldsForm';

interface TaskRevisionViewProps {
  taskId: string;
}

// Shows what was submitted for a finished task, read-only. Not through prepareClaim (like the
// annotate page): Madoc does not see an accepted task (status 3) as an existing claim, so
// prepare-claim would answer "Maximum number of contributors reached" for exactly these tasks.
// Instead the same route as the review page: task -> revision -> capture model.
export function TaskRevisionView({ taskId }: TaskRevisionViewProps) {
  const { t } = useTranslation('dissco-cs');

  const taskQuery = useQuery(taskQueries.detail(taskId));
  const revisionId = taskQuery.data?.state?.revisionId;

  const revisionQuery = useQuery(captureModelQueries.revision(revisionId));
  const modelQuery = useQuery(captureModelQueries.model(revisionQuery.data?.captureModelId));

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
      <SubmissionFieldsForm model={model} document={cloneModelDocument(model)} readOnly />
    </div>
  );
}
