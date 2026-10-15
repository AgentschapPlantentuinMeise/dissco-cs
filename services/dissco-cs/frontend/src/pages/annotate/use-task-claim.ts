import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '../../api/queries/projects';
import { taskKeys } from '../../api/queries/tasks';
import { projectsApi } from '../../api/cs-client/projects';
import { reportClientError } from '../../api/cs-client/client-errors';
import { showError } from '../../hooks/use-toast';
import { MadocCreateResourceClaimDto, MadocPrepareClaimDto } from '@dissco-cs/shared-types';

// crypto.randomUUID() only exists in secure contexts (https/localhost); this dev
// deployment is served over plain http, so fall back to crypto.getRandomValues,
// which is available everywhere.
function generateUUID(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// The user's claim on this manifest's task: claimed on entry, released on exit unless something
// was saved. Also owns the revision id that every edit and save of this task is tagged with.
export function useTaskClaim({
  projectId,
  manifestId,
  prepared,
  onLeave,
}: {
  projectId: number | undefined;
  manifestId: number | undefined;
  prepared: MadocPrepareClaimDto | undefined;
  // Runs in the cleanup of a fresh claim, just before it is released (stops a pending autosave).
  onLeave: () => void;
}) {
  const queryClient = useQueryClient();
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;

  // One id per editing session, reused across every edit AND every save of this document — the
  // server only merges a field's new value into the canonical document when that field carries
  // `revision === revision.id` of the submitted revision (extract-valid-revision-changes.ts), so
  // edits must be tagged with the SAME id that's later submitted as `revision.id`. A fresh id per
  // save (e.g. crypto.randomUUID() at save time) would never match what was tagged on the fields.
  const revisionIdRef = useRef<string>(generateUUID());
  const hasSaved = useRef(false);
  const claimIdRef = useRef<string | undefined>(undefined);
  // Holds the in-flight claim request itself, not just its resolved id — needed because a user
  // can leave faster than the claim POST round-trips. Without awaiting this, releaseClaim would
  // see claimIdRef.current still undefined, skip the abandon entirely, and the claim that finishes
  // arriving moments later (after this component already unmounted) would never get released.
  const claimPromiseRef = useRef<Promise<MadocCreateResourceClaimDto> | null>(null);

  // Resolves the claim's task id, waiting on the in-flight claim request if it hasn't landed yet
  // (a user can act faster than the claim POST round-trips) — shared by releaseClaim and save.
  const getClaimId = async (): Promise<string | undefined> => {
    if (claimIdRef.current) return claimIdRef.current;
    if (!claimPromiseRef.current) return undefined;
    try {
      const result = await claimPromiseRef.current;
      return result?.claim?.id;
    } catch {
      return undefined; // Claim never succeeded.
    }
  };

  // Fire-and-forget release, used by the effect cleanup below (unmount / browser back-button —
  // cases we can't intercept). Also exposed as an awaitable so in-app navigation links can finish
  // the release BEFORE the next page mounts and fetches, instead of racing it (see handleLeave).
  const releaseClaim = async () => {
    if (hasSaved.current) return;
    if (!projectId || !manifestId) return;

    const claimId = await getClaimId();
    if (!claimId) return;

    try {
      // Deletes the claim task outright (upstream madoc-ts route), instead of leaving an
      // 'abandoned' row behind — see AnnotatePage/manifest-claims discussion.
      await projectsApi.revokeClaim(projectId, { manifestId });
      // Best-effort: madoc-ts only re-syncs the shared max-contributors counter when a NEW claim
      // is created, never on an abandon — without this, a manifest that hit its contributor
      // limit stays blocked for everyone (incl. this user) once its only active claim is released.
      await projectsApi.resyncClaim(projectId, manifestId).catch(err => reportClientError(err, 'action'));
      // After the resync, so the refetch sees the recalculated counter: ProjectDetail's "Choose where
      // to start" grid (project progress) shows the manifest as available again.
      queryClient.invalidateQueries({ queryKey: projectKeys.progress(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    } catch (err) {
      reportClientError(err, 'action');
    }
  };

  // One combined effect, keyed by manifestId + prepared: claims on entry, releases on exit. Using a
  // single effect matters because React Router does NOT remount when only manifestId changes.
  // We depend on `prepared` so we can read the existing claim status before deciding what to do:
  // - status >= 1 (saved/submitted): reuse the existing claim id, never abandon on leave.
  // - no claim or status 0: create a fresh claim and abandon it on leave if nothing was saved.
  useEffect(() => {
    hasSaved.current = false;
    claimIdRef.current = undefined;
    claimPromiseRef.current = null;

    if (!projectId || !manifestId) return;
    if (!prepared) return; // wait until prepare-claim is done, so we know the existing status

    const existingStatus = prepared.claim?.status as number | undefined;

    // Existing claim (saved or submitted): use the existing claim id and set hasSaved so
    // releaseClaim does nothing -- the task status stays untouched. Reuse the revisionId stored on
    // the task (if any) so a next autosave updates the same capture_model_revision row instead of
    // adding a new one -- older tasks from before this change have no stored revisionId, hence the
    // fallback.
    if (existingStatus !== undefined && existingStatus >= 1) {
      const existingRevisionId = prepared.claim?.state?.revisionId as string | undefined;
      claimIdRef.current = prepared.claim?.id;
      revisionIdRef.current = existingRevisionId || generateUUID();
      hasSaved.current = true;
      return;
    }

    // New claim or abandoned task (status 0): create it and abandon it on leave. The revisionId is
    // sent along so the task stores it (state.revisionId) and later reopenings can reuse it above.
    revisionIdRef.current = generateUUID();
    const promise = projectsApi.claim(projectId, { manifestId, status: 0, revisionId: revisionIdRef.current });
    claimPromiseRef.current = promise;
    promise
      .then(result => {
        claimIdRef.current = result?.claim?.id;
        if (!claimIdRef.current) {
          reportClientError(new Error('Claim response has no claim.id, release will not work'), 'action');
        }
      })
      .catch(err => {
        reportClientError(err, 'action');
        showError('error_claim_failed');
      });

    return () => {
      onLeaveRef.current();
      releaseClaim();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, manifestId, prepared]);

  // The explicit, user-requested variant of releaseClaim: that one deliberately does NOTHING once
  // hasSaved is true (autosave already ran), but here the user does want to let go of the task
  // despite that saved draft.
  const releaseTask = async () => {
    // Before the network call, so the unmount cleanup (releaseClaim) after the caller navigates
    // away does not send a second, needless abandon -- same reason as in save.
    hasSaved.current = true;
    if (!projectId || !manifestId) return;
    try {
      await projectsApi.revokeClaim(projectId, { manifestId });
      await projectsApi.resyncClaim(projectId, manifestId).catch(err => reportClientError(err, 'action'));
      queryClient.invalidateQueries({ queryKey: projectKeys.progress(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    } catch (err) {
      reportClientError(err, 'action');
      showError('error_release_failed');
    }
  };

  return {
    revisionId: () => revisionIdRef.current,
    getClaimId,
    // Set before a save's network call (not after) so that a user who navigates away while the
    // save is still in flight can never race releaseClaim into abandoning a task being saved.
    markSaved: () => {
      hasSaved.current = true;
    },
    releaseClaim,
    releaseTask,
  };
}
