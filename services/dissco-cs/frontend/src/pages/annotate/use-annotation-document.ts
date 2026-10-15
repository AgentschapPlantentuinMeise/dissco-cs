import { useEffect, useState } from 'react';
import { cloneModelDocument, createBlankDocument, setFieldValue, setFieldSelector, collectSelectorStates, pathsEqual, DocumentPath } from '../../utility/annotation-document';
import { MadocAnnotationDocumentDto, MadocBoxSelectorState, MadocCaptureModelDto, MadocPrepareClaimDto, MadocStructureNodeDto } from '@dissco-cs/shared-types';

// The document the volunteer fills in: field values and regions drawn on the image. Every change
// is tagged with the task's revision id. Saving is not done here (see use-annotation-save).
export function useAnnotationDocument({
  model,
  prepared,
  projectId,
  manifestId,
  canvasIndex,
  revisionId,
}: {
  model: MadocCaptureModelDto | undefined;
  prepared: MadocPrepareClaimDto | undefined;
  projectId: number | undefined;
  manifestId: number | undefined;
  canvasIndex: number;
  revisionId: () => string;
}) {
  const [annotationDocument, setAnnotationDocument] = useState<MadocAnnotationDocumentDto | null>(null);
  const [activeStructure, setActiveStructure] = useState<(MadocStructureNodeDto & { type: 'model' }) | null>(null);
  // Path of the field currently being drawn on the image, if any — coordinates are only valid for
  // the canvas shown when drawing started, so switching canvas mid-draw cancels it (effect below).
  const [drawingPath, setDrawingPath] = useState<DocumentPath | null>(null);

  useEffect(() => {
    setDrawingPath(null);
  }, [canvasIndex]);

  // A different task (same dependencies as the claim effect in use-task-claim) starts without a draw.
  useEffect(() => {
    setDrawingPath(null);
  }, [projectId, manifestId, prepared]);

  useEffect(() => {
    if (!model || !prepared) return;
    // Resuming your own active claim (status >= 1): keep the current document as-is. A genuinely
    // new claim starts blank instead — the model's own `document` is shared per manifest and may
    // still carry values from a previous, possibly abandoned, contribution by anyone.
    const existingStatus = prepared.claim?.status as number | undefined;
    const isResuming = existingStatus !== undefined && existingStatus >= 1;
    setAnnotationDocument(isResuming ? cloneModelDocument(model) : createBlankDocument(model));
  }, [model, prepared]);

  const setValue = (path: DocumentPath, value: unknown) => {
    setAnnotationDocument(doc => (doc ? setFieldValue(doc, path, value, revisionId()) : doc));
  };

  // Stores the region just drawn on the field that asked for it. Returns false when no draw was in
  // progress, so nothing changed.
  const setDrawnSelector = (state: MadocBoxSelectorState): boolean => {
    if (!drawingPath) return false;
    setAnnotationDocument(doc => (doc ? setFieldSelector(doc, drawingPath, state, revisionId()) : doc));
    setDrawingPath(null);
    return true;
  };

  const clearSelector = (path: DocumentPath) => {
    setAnnotationDocument(doc => (doc ? setFieldSelector(doc, path, null, revisionId()) : doc));
  };

  // Regions already saved on other fields, shown as overlays — excludes the field currently being
  // (re)drawn so its stale box doesn't sit underneath the live drag overlay.
  const savedSelectors = annotationDocument
    ? collectSelectorStates(annotationDocument).filter(entry => !pathsEqual(entry.path, drawingPath))
    : [];

  return {
    annotationDocument,
    activeStructure,
    setActiveStructure,
    drawingPath,
    requestDraw: (path: DocumentPath) => setDrawingPath(path),
    cancelDraw: () => setDrawingPath(null),
    setValue,
    setDrawnSelector,
    clearSelector,
    savedSelectors,
  };
}
