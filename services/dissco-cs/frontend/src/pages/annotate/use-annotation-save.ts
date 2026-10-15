import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '../../api/queries/projects';
import { taskKeys } from '../../api/queries/tasks';
import { captureModelsApi } from '../../api/cs-client/capture-models';
import { tasksApi } from '../../api/cs-client/tasks';
import { MadocAnnotationDocumentDto, MadocCaptureModelDto, MadocPrepareClaimDto, MadocStructureNodeDto } from '@dissco-cs/shared-types';

// Saving the document as draft or submitted, and the autosave: a first save ~2s after the user
// stops editing, then every 30s while there are unsaved edits.
export function useAnnotationSave({
  projectId,
  manifestId,
  prepared,
  enableAutoSave,
  model,
  annotationDocument,
  activeStructure,
  claim,
}: {
  projectId: number | undefined;
  manifestId: number | undefined;
  prepared: MadocPrepareClaimDto | undefined;
  enableAutoSave: boolean;
  model: MadocCaptureModelDto | undefined;
  annotationDocument: MadocAnnotationDocumentDto | null;
  activeStructure: (MadocStructureNodeDto & { type: 'model' }) | null;
  claim: { revisionId: () => string; getClaimId: () => Promise<string | undefined>; markSaved: () => void };
}) {
  const queryClient = useQueryClient();
  // Set on every edit, cleared once that edit has actually been persisted — used to decide
  // whether a periodic/first autosave has anything new to save.
  const isDirty = useRef(false);
  const [firstSaveDone, setFirstSaveDone] = useState(false);
  const firstSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingAutosave = () => {
    if (firstSaveTimerRef.current) {
      clearTimeout(firstSaveTimerRef.current);
      firstSaveTimerRef.current = null;
    }
  };

  // A different task (same dependencies as the claim effect in use-task-claim) starts clean.
  useEffect(() => {
    isDirty.current = false;
    setFirstSaveDone(false);
    cancelPendingAutosave();
  }, [projectId, manifestId, prepared]);

  const { mutateAsync: save, isPending: saving } = useMutation({
    mutationFn: async (status: 'draft' | 'submitted') => {
      if (!model || !annotationDocument || !activeStructure) return;
      claim.markSaved();
      await captureModelsApi.createRevision(
        {
          // A model fetched via captureModelsApi.get() always carries its own id back -- id is only
          // optional on MadocCaptureModelDto because a freshly-built local model (never seen here) wouldn't.
          captureModelId: model.id!,
          document: annotationDocument,
          // Same id reused across saves (see use-task-claim) — the server upserts a revision row
          // by id, so re-submitting with this id updates the same draft instead of creating a new
          // one each time.
          revision: { id: claim.revisionId(), structureId: activeStructure.id, fields: activeStructure.fields, status },
        },
        status
      );
      isDirty.current = false;

      // createCaptureModelRevision only writes the model-api revision — the task itself (what the
      // dashboard's task list queries) stays at its initial "assigned" status (0) unless we update
      // it here too, same as releaseClaim does for abandoned claims.
      const claimId = await claim.getClaimId();
      if (claimId) {
        await tasksApi.update(claimId, {
          status: status === 'draft' ? 1 : 2,
          status_text: status === 'draft' ? 'in progress' : 'submitted',
        });
        queryClient.invalidateQueries({ queryKey: taskKeys.all });
        if (projectId) {
          queryClient.invalidateQueries({ queryKey: projectKeys.progress(projectId) });
        }
      }
    },
  });

  // Fires the very first background save ~2s after the user stops editing/drawing — only once
  // per task; a later periodic save takes over after this succeeds.
  const scheduleFirstAutosave = () => {
    if (!enableAutoSave) return;
    if (firstSaveDone || firstSaveTimerRef.current) return;
    firstSaveTimerRef.current = setTimeout(async () => {
      firstSaveTimerRef.current = null;
      if (!isDirty.current) return;
      try {
        await save('draft');
        setFirstSaveDone(true);
      } catch {
        // Already reported and shown to the user by the global MutationCache handler.
      }
    }, 2000);
  };

  // Takes over once the first autosave has landed — catches edits made without a natural pause
  // (e.g. typing continuously in one field) that the 2s-inactivity debounce above would otherwise
  // miss. Cleared automatically when firstSaveDone flips back to false on task switch (see the
  // reset effect above), so it never keeps saving into a task the user has left.
  useEffect(() => {
    if (!enableAutoSave) return;
    if (!firstSaveDone) return;
    const interval = setInterval(() => {
      if (!isDirty.current) return;
      // A failure is already reported and shown by the global MutationCache handler.
      save('draft').catch(() => undefined);
    }, 30000);
    return () => clearInterval(interval);
  }, [firstSaveDone]);

  return {
    save,
    saving,
    firstSaveDone,
    // Every edit of the document: there is something new to save.
    markDirty: () => {
      isDirty.current = true;
      scheduleFirstAutosave();
    },
    cancelPendingAutosave,
  };
}
