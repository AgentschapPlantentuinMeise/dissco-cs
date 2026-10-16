import { useQuery } from '@tanstack/react-query';
import { captureModelQueries } from '../../api/queries/capture-models';
import { ReviewTaskDto, MadocAnnotationDocumentDto } from '@dissco-cs/shared-types';
import { cloneModelDocument, setFieldValue, DocumentPath } from '../../utility/annotation-document';

// The document to show for a review row: fetches the revision and the capture model, and returns
// the reviewer's local correction when there is one, otherwise the submitted document.
export function useReviewRevisionDocument(
  row: ReviewTaskDto,
  editedDocument: MadocAnnotationDocumentDto | undefined,
  onDocumentChange: (rowId: string, document: MadocAnnotationDocumentDto) => void
) {
  const revisionQuery = useQuery(captureModelQueries.revision(row.revisionId));
  const modelQuery = useQuery(captureModelQueries.model(revisionQuery.data?.captureModelId));

  const currentDocument: MadocAnnotationDocumentDto | undefined = modelQuery.data
    ? editedDocument ?? cloneModelDocument(modelQuery.data)
    : undefined;

  const handleChange = (path: DocumentPath, value: unknown) => {
    if (!currentDocument) return;
    onDocumentChange(row.id, setFieldValue(currentDocument, path, value, row.revisionId as string));
  };

  return { revisionQuery, modelQuery, currentDocument, handleChange };
}
