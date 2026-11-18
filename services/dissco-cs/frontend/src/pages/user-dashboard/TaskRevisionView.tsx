import { useQuery } from '@tanstack/react-query';
import { taskQueries } from '../../api/queries/tasks';
import { captureModelQueries } from '../../api/queries/capture-models';
import { cloneModelDocument } from '../../utility/annotation-document';
import { SubmissionFieldsForm } from '../../components/capture-models/SubmissionFieldsForm';
import { SectionLoadError } from '../../components/layout/SectionLoadError';
import { loadState } from '../../api/query-state';
import { LoadingText } from '../../components/layout/LoadingText';

interface TaskRevisionViewProps {
  taskId: string;
}

// Shows what was submitted for a finished task, read-only. Not through prepareClaim (like the
// annotate page): Madoc does not see an accepted task (status 3) as an existing claim, so
// prepare-claim would answer "Maximum number of contributors reached" for exactly these tasks.
// Instead the same route as the review page: task -> revision -> capture model.
export function TaskRevisionView({ taskId }: TaskRevisionViewProps) {

  const taskQuery = useQuery(taskQueries.detail(taskId));
  const revisionId = taskQuery.data?.state?.revisionId;

  const revisionQuery = useQuery(captureModelQueries.revision(revisionId));
  const modelQuery = useQuery(captureModelQueries.model(revisionQuery.data?.captureModelId));

  // Without a revision id the revision and model queries never run, so they are left out.
  const load = loadState(taskQuery, ...(revisionId ? [revisionQuery, modelQuery] : []));
  if (load === 'loading') {
    return <LoadingText />;
  }

  const model = modelQuery.data;
  if (load === 'failed' || !revisionId || !model) {
    return <SectionLoadError />;
  }

  return (
    <div className="px-1 py-3">
      <SubmissionFieldsForm model={model} document={cloneModelDocument(model)} readOnly />
    </div>
  );
}
