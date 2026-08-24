import { useQuery } from 'react-query';
import { getCaptureModelRevision, getCaptureModel } from '../../api/madoc-client/crowdsourcing';
import { ReviewTaskRow } from '../../api/cs-api';
import { cloneModelDocument, setFieldValue, DocumentPath } from '../annotate/form/document';
import { AnnotationDocument } from '../../capture-model/types/document';
import { CaptureModel } from '../../capture-model/types/capture-model';

// Gebruikt door ReviewInlineExpansion: haalt de revisie + het capture model op en levert het
// document dat getoond moet worden (lokale correctie indien aanwezig, anders een leeg document
// op basis van het model).
export function useReviewRevisionDocument(
  row: ReviewTaskRow,
  editedDocument: AnnotationDocument | undefined,
  onDocumentChange: (rowId: string, document: AnnotationDocument) => void
) {
  const revisionQuery = useQuery(
    ['review-revision', row.revisionId],
    () => getCaptureModelRevision(row.revisionId as string),
    { enabled: !!row.revisionId }
  );
  const modelQuery = useQuery<CaptureModel>(
    ['capture-model', revisionQuery.data?.captureModelId],
    () => getCaptureModel(revisionQuery.data.captureModelId),
    { enabled: !!revisionQuery.data?.captureModelId }
  );

  const currentDocument: AnnotationDocument | undefined = modelQuery.data
    ? editedDocument ?? cloneModelDocument(modelQuery.data)
    : undefined;

  const handleChange = (path: DocumentPath, value: unknown) => {
    if (!currentDocument) return;
    onDocumentChange(row.id, setFieldValue(currentDocument, path, value, row.revisionId as string));
  };

  return { revisionQuery, modelQuery, currentDocument, handleChange };
}
