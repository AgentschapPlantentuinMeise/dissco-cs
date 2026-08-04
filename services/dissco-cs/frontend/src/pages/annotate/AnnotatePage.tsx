import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, queryCache } from 'react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { madocClient, ApiError } from '../../api/madoc-client';
import { manifestClaimApi } from '../../api/cs-api';
import { getSiteSlug } from '../../api/slug';
import { useProject } from '../../hooks/use-project';
import { useRouteContext } from '../../hooks/use-route-context';
import { useDisscoCSNavigation } from '../../hooks/use-dissco-cs-navigation';
import { disscoCSConfig } from '../../dissco-cs-config';
import { CsPage } from '../../components/CsPage';
import { LocaleString } from '../../components/LocaleString';
import { ProjectManualModal } from '../../components/ProjectManualModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { BookIcon } from '../../icons/BookIcon';
import { AnnotateLayout } from './AnnotateLayout';
import { OpenSeadragonViewer } from './viewer/OpenSeadragonViewer';
import { CaptureModelForm } from './form/CaptureModelForm';
import { createEmptyDocument, createBlankDocument, setFieldValue, setFieldSelector, collectSelectorStates, pathsEqual, DocumentPath } from './form/document';
import { AnnotationDocument } from '../../capture-model/types/document';
import { CaptureModel, StructureNode } from '../../capture-model/types/capture-model';
import { BoxSelectorState } from '../../capture-model/types/selector-types';

function getImageServiceId(canvas: any): string | undefined {
  const annotation = canvas?.items?.[0]?.items?.[0];
  const body = Array.isArray(annotation?.body) ? annotation.body[0] : annotation?.body;
  const service = Array.isArray(body?.service) ? body.service[0] : body?.service;
  return service?.id || service?.['@id'];
}

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

export function AnnotatePage() {
  const { t } = useTranslation('dissco-cs');
  const { projectId, manifestId } = useRouteContext();
  const { data: project } = useProject();
  const { requestNextUrl, isLoadingNext } = useDisscoCSNavigation();
  const navigate = useNavigate();
  const slug = getSiteSlug();

  // Tasks are handed out randomly, not in a fixed sequence, so "previous" can only mean "the
  // manifest I was on before" — tracked here as a simple visited stack, not derived from any list.
  const [visited, setVisited] = useState<number[]>([]);
  const [manualOpen, setManualOpen] = useState(false);

  const [navBottom, setNavBottom] = useState(70);
  useEffect(() => {
    const navbar = document.querySelector('.cs-navbar') as HTMLElement | null;
    if (navbar) setNavBottom(navbar.getBoundingClientRect().bottom);
  }, []);

  const { data: structure, isError: structureError, error: structureErrorObj } = useQuery(
    ['manifest-structure', manifestId],
    () => madocClient.getManifestStructure(manifestId!),
    { enabled: !!manifestId, retry: false }
  );
  const canvases = structure?.items ?? [];
  const [canvasIndex, setCanvasIndex] = useState(0);

  const { data: canvasData } = useQuery(
    ['canvas', canvases[canvasIndex]?.id],
    () => madocClient.getSiteCanvas(canvases[canvasIndex].id),
    { enabled: !!canvases[canvasIndex] }
  );

  const { data: prepared, isError: preparedError, error: preparedErrorObj } = useQuery(
    ['prepare-claim', project?.id, manifestId],
    () => madocClient.prepareClaim(project!.id, { manifestId }),
    { enabled: !!project?.id && !!manifestId, retry: false }
  );
  useEffect(() => {
    if (prepared) {
      console.log('[CS] prepareClaim resultaat', {
        manifestId,
        claimId: prepared.claim?.id,
        claimStatus: prepared.claim?.status,
        modelId: prepared.model?.id,
        fullPrepared: prepared,
      });
    }
  }, [prepared, manifestId]);

  const { data: model, isError: modelError, error: modelErrorObj } = useQuery<CaptureModel>(
    ['capture-model', prepared?.model?.id],
    () => madocClient.getCaptureModel(prepared!.model!.id),
    { enabled: !!prepared?.model, retry: false }
  );

  const [annotationDocument, setAnnotationDocument] = useState<AnnotationDocument | null>(null);
  const [activeStructure, setActiveStructure] = useState<(StructureNode & { type: 'model' }) | null>(null);
  // One id per editing session, reused across every edit AND every save of this document — the
  // server only merges a field's new value into the canonical document when that field carries
  // `revision === revision.id` of the submitted revision (extract-valid-revision-changes.ts), so
  // edits must be tagged with the SAME id that's later submitted as `revision.id`. A fresh id per
  // save (e.g. crypto.randomUUID() at save time) would never match what was tagged on the fields.
  const revisionIdRef = useRef<string>(generateUUID());
  // Path of the field currently being drawn on the image, if any — coordinates are only valid for
  // the canvas shown when drawing started, so switching canvas mid-draw cancels it (effect below).
  const [drawingPath, setDrawingPath] = useState<DocumentPath | null>(null);

  useEffect(() => {
    setDrawingPath(null);
  }, [canvasIndex]);

  const handleRequestDraw = (path: DocumentPath) => setDrawingPath(path);
  const handleCancelDraw = () => setDrawingPath(null);
  const handleSelectorDrawn = (state: BoxSelectorState) => {
    if (!drawingPath) return;
    setAnnotationDocument(doc => (doc ? setFieldSelector(doc, drawingPath, state, revisionIdRef.current) : doc));
    setDrawingPath(null);
    isDirty.current = true;
    scheduleFirstAutosave();
  };
  const handleClearSelector = (path: DocumentPath) => {
    setAnnotationDocument(doc => (doc ? setFieldSelector(doc, path, null, revisionIdRef.current) : doc));
    isDirty.current = true;
    scheduleFirstAutosave();
  };
  // Regions already saved on other fields, shown as overlays — excludes the field currently being
  // (re)drawn so its stale box doesn't sit underneath the live drag overlay.
  const savedSelectors = annotationDocument
    ? collectSelectorStates(annotationDocument).filter(entry => !pathsEqual(entry.path, drawingPath))
    : [];

  useEffect(() => {
    if (model) console.log('[CS] full capture model', model);
  }, [model]);

  useEffect(() => {
    if (annotationDocument) console.log('[CS] current document state', annotationDocument);
  }, [annotationDocument]);

  useEffect(() => {
    if (!model || !prepared) return;
    // Resuming your own active claim (status >= 1): keep the current document as-is. A genuinely
    // new claim starts blank instead — the model's own `document` is shared per manifest and may
    // still carry values from a previous, possibly abandoned, contribution by anyone.
    const existingStatus = prepared.claim?.status as number | undefined;
    const isResuming = existingStatus !== undefined && existingStatus >= 1;
    setAnnotationDocument(isResuming ? createEmptyDocument(model) : createBlankDocument(model));
  }, [model, prepared]);

  const hasSaved = useRef(false);
  const claimIdRef = useRef<string | undefined>(undefined);
  // Set on every edit, cleared once that edit has actually been persisted — used to decide
  // whether a periodic/first autosave has anything new to save.
  const isDirty = useRef(false);
  // Holds the in-flight claim request itself, not just its resolved id — needed because a user
  // can leave faster than the claim POST round-trips. Without awaiting this, releaseClaim would
  // see claimIdRef.current still undefined, skip the abandon entirely, and the claim that finishes
  // arriving moments later (after this component already unmounted) would never get released.
  const claimPromiseRef = useRef<Promise<{ claim: any } | undefined> | null>(null);

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
    if (!project?.id || !manifestId) return;

    const claimId = await getClaimId();
    if (!claimId) return;

    console.log('[CS] releasing claim', { manifestId, claimId });
    try {
      // Deletes the claim task outright (upstream madoc-ts route), instead of leaving an
      // 'abandoned' row behind — see AnnotatePage/manifest-claims discussion.
      await madocClient.revokeResourceClaim(project.id, { manifestId });
      // ProjectDetail.tsx's manifest list is cached under ['collection', collectionId] — invalidate by
      // prefix so the "Choose where to start" grid re-fetches and shows the manifest as available again.
      queryCache.invalidateQueries('collection');
      // Best-effort: madoc-ts only re-syncs the shared max-contributors counter when a NEW claim
      // is created, never on an abandon — without this, a manifest that hit its contributor
      // limit stays blocked for everyone (incl. this user) once its only active claim is released.
      await manifestClaimApi.resync(project.id, manifestId).catch(err => console.error('[CS] resync failed', err));
    } catch (err) {
      console.error('[CS] abandon failed', err);
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
    setConfirmation(null);
    setAdvancing(false);
    setDrawingPath(null);
    isDirty.current = false;
    setFirstSaveDone(false);
    if (firstSaveTimerRef.current) {
      clearTimeout(firstSaveTimerRef.current);
      firstSaveTimerRef.current = null;
    }

    if (!project?.id || !manifestId) return;
    if (!prepared) return; // wacht tot prepare-claim klaar is zodat we de bestaande status weten

    const existingStatus = prepared.claim?.status as number | undefined;

    // Bestaande claim (opgeslagen of ingediend): gebruik het bestaande claim-id en zet hasSaved
    // op true zodat releaseClaim niets doet — de taakstatus blijft onaangeroerd. Hergebruik de
    // revisionId die op de taak staat (indien aanwezig) zodat een volgende autosave dezelfde
    // capture_model_revision-rij bijwerkt in plaats van er een nieuwe bij te maken — oudere taken
    // van vóór deze wijziging hebben nog geen opgeslagen revisionId, vandaar de fallback.
    if (existingStatus !== undefined && existingStatus >= 1) {
      const existingRevisionId = prepared.claim?.state?.revisionId as string | undefined;
      console.log('[CS] bestaande claim gevonden, geen nieuwe aanmaken', { existingStatus, claimId: prepared.claim?.id, existingRevisionId });
      claimIdRef.current = prepared.claim?.id;
      revisionIdRef.current = existingRevisionId || generateUUID();
      hasSaved.current = true;
      return;
    }

    // Nieuwe claim of verlaten taak (status 0): maak aan en abandon bij verlaten. De revisionId
    // wordt meegestuurd zodat de taak 'm bewaart (state.revisionId) en toekomstige heropeningen
    // 'm hierboven kunnen hergebruiken.
    revisionIdRef.current = generateUUID();
    console.log('[CS] claiming manifest', { projectId: project.id, manifestId, revisionId: revisionIdRef.current });
    const promise = madocClient.createResourceClaim(project.id, { manifestId, status: 0, revisionId: revisionIdRef.current });
    claimPromiseRef.current = promise;
    promise
      .then(result => {
        console.log('[CS] claim result', result);
        claimIdRef.current = result?.claim?.id;
        if (!claimIdRef.current) {
          console.error('[CS] claim response has no claim.id — release will not work', result);
        }
      })
      .catch(err => console.error('[CS] claim failed', err));

    return () => {
      if (firstSaveTimerRef.current) {
        clearTimeout(firstSaveTimerRef.current);
        firstSaveTimerRef.current = null;
      }
      releaseClaim();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, manifestId, prepared]);

  const handleLeave = async (to: string) => {
    await releaseClaim();
    navigate(to);
  };

  // Expliciete, door de gebruiker aangevraagde variant van releaseClaim: die functie doet
  // bewust NIETS zodra hasSaved true is (autosave heeft al gedraaid), maar hier wil de
  // gebruiker de taak juist wél loslaten ondanks dat opgeslagen concept.
  const [releaseConfirmOpen, setReleaseConfirmOpen] = useState(false);
  const handleReleaseTask = async () => {
    // Voor de netwerk-call, zodat de unmount-cleanup (releaseClaim) na de navigate() hieronder
    // geen tweede (overbodige) abandon-call meer doet — zelfde reden als in `save` hierboven.
    hasSaved.current = true;
    if (project?.id && manifestId) {
      try {
        await madocClient.revokeResourceClaim(project.id, { manifestId });
        queryCache.invalidateQueries('collection');
        queryCache.invalidateQueries('my-tasks');
        await manifestClaimApi.resync(project.id, manifestId).catch(err => console.error('[CS] resync failed', err));
      } catch (err) {
        console.error('[CS] release failed', err);
      }
    }
    navigate(`/explore/${project?.slug}`);
  };

  const [save, { isLoading: saving }] = useMutation(async (status: 'draft' | 'submitted') => {
    if (!model || !annotationDocument || !activeStructure) return;
    // Set before the network call (not after) so that a user who navigates away while this save
    // is still in flight can never race releaseClaim into sending an abandon for a task that's
    // actually being saved.
    hasSaved.current = true;
    await madocClient.createCaptureModelRevision(
      {
        captureModelId: model.id,
        document: annotationDocument,
        // Same id reused across saves (see revisionIdRef above) — the server upserts a revision
        // row by id, so re-submitting with this id updates the same draft instead of creating a
        // new one each time.
        revision: { id: revisionIdRef.current, structureId: activeStructure.id, fields: activeStructure.fields, status },
      },
      status
    );
    isDirty.current = false;

    // createCaptureModelRevision only writes the model-api revision — the task itself (what the
    // dashboard's task list queries) stays at its initial "assigned" status (0) unless we update
    // it here too, same as releaseClaim does for abandoned claims.
    const claimId = await getClaimId();
    if (claimId) {
      await madocClient.updateTask(claimId, {
        status: status === 'draft' ? 1 : 2,
        status_text: status === 'draft' ? 'in progress' : 'submitted',
      });
      queryCache.invalidateQueries('my-tasks');
    }
  });

  const [firstSaveDone, setFirstSaveDone] = useState(false);
  const firstSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fires the very first background save ~2s after the user stops editing/drawing — only once
  // per task; a later periodic save takes over after this succeeds.
  const scheduleFirstAutosave = () => {
    if (firstSaveDone || firstSaveTimerRef.current) return;
    firstSaveTimerRef.current = setTimeout(async () => {
      firstSaveTimerRef.current = null;
      if (!isDirty.current) return;
      await save('draft');
      setFirstSaveDone(true);
    }, 2000);
  };

  // Asks for another random assignment (same endpoint as ProjectDetail's "Start" button) and goes
  // there — falling back to the project page once none are left. Records the manifest we're
  // leaving so "Vorige taak" has somewhere to go back to.
  const goToNext = async () => {
    const url = await requestNextUrl(undefined);
    if (manifestId) setVisited(v => [...v, manifestId]);
    await handleLeave(url ?? `/explore/${project?.slug}`);
  };

  const goToPrevious = async () => {
    const prevManifestId = visited[visited.length - 1];
    if (prevManifestId === undefined) return;
    setVisited(v => v.slice(0, -1));
    await handleLeave(`/explore/${project?.slug}/manifests/${prevManifestId}/annotate`);
  };

  // Shows a brief confirmation toast, then moves on to the next task — used for both save actions,
  // so the user always gets feedback that the save succeeded before the page changes under them.
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const handleSaveAndAdvance = async (status: 'draft' | 'submitted') => {
    setAdvancing(true);
    await save(status);
    setConfirmation(status === 'draft' ? t('annotate_saved_draft', 'Opgeslagen als concept') : t('annotate_submitted', 'Ingediend'));
    await new Promise(resolve => setTimeout(resolve, 1200));
    await goToNext();
  };

  // Same save as handleSaveAndAdvance('draft') but stays on the current task — no goToNext().
  const handleSaveDraft = async () => {
    await save('draft');
    setConfirmation(t('annotate_saved_draft', 'Opgeslagen als concept'));
  };

  if (structureError || preparedError || modelError) {
    const err = structureErrorObj || preparedErrorObj || modelErrorObj;

    if (err instanceof ApiError && err.status === 404) {
      return (
        <CsPage>
          <div className="cs-main-wrapper py-16 text-center text-gray-600">
            {t('annotate_no_access', 'Deze taak kan niet worden geladen. Mogelijk heb je geen toegang tot dit project, of bestaat de taak niet meer. Neem contact op met de sitebeheerder als dit niet klopt.')}
          </div>
        </CsPage>
      );
    }

    return (
      <CsPage>
        <div className="cs-main-wrapper py-16 text-center text-red-600">
          {t('annotate_error_loading', 'Fout bij laden van de taak: {{error}}', {
            error: err instanceof Error ? err.message : String(err),
          })}
        </div>
      </CsPage>
    );
  }

  if (prepared && !prepared.model) {
    return (
      <CsPage>
        <div className="cs-main-wrapper py-16 text-center text-gray-500">
          {t('annotate_no_capture_model', 'Dit project heeft geen capture model geconfigureerd, dus deze taak kan niet getoond worden.')}
        </div>
      </CsPage>
    );
  }


  if (!project || !model || !annotationDocument) {
    return (
      <CsPage>
        <div className="cs-main-wrapper py-16 text-center text-gray-500">{t('pdp_loading')}</div>
      </CsPage>
    );
  }

  const isSubmittedTask = !!prepared && (prepared.claim?.status as number) >= 2;

  const manifestUrl = `${window.location.origin}/s/${slug}/madoc/api/manifests/${manifestId}/export/source`;
  const currentCanvas = canvases[canvasIndex];
  

  const handleChange = (path: DocumentPath, value: unknown) => {
    setAnnotationDocument(doc => (doc ? setFieldValue(doc, path, value, revisionIdRef.current) : doc));
    isDirty.current = true;
    scheduleFirstAutosave();
  };

  return (
    <CsPage>
      {/* navBottom is measured from the actual navbar, not guessed, so this section's height
          exactly fills the rest of the viewport — no page-level scrollbar on top of the panel's own. */}
      <div className="flex flex-col" style={{ height: `calc(100vh - ${navBottom}px)` }}>
        <div className="px-4 py-2 border-b border-gray-300 flex items-center justify-between flex-shrink-0">
          <nav className="text-[0.85rem] text-gray-500" aria-label="Breadcrumb">
            <Link
              to="/explore"
              onClick={e => {
                e.preventDefault();
                handleLeave("/explore");
              }}
              className="text-[var(--cs-primary)] no-underline hover:underline"
            >
              {t('nav_projects', 'Projecten')}
            </Link>
            <span className="mx-1">›</span>
            <Link
              to={`/explore/${project.slug}`}
              onClick={e => {
                e.preventDefault();
                handleLeave(`/explore/${project.slug}`);
              }}
              className="text-[var(--cs-primary)] no-underline hover:underline"
            >
              <LocaleString>{project.label}</LocaleString>
            </Link>
            <span className="mx-1">›</span>
            <LocaleString>{currentCanvas?.label ?? { en: ['...'] }}</LocaleString>
          </nav>
          <div className="flex items-center gap-2">
            <button
              className="text-[0.85rem] text-[var(--cs-primary)] border border-[var(--cs-primary)] rounded px-2 py-1 inline-flex items-center gap-1.5 leading-none cursor-pointer bg-white"
              onClick={() => setManualOpen(true)}
            >
              <BookIcon aria-hidden="true" className="translate-y-px" /> {t('annotate_manual_button', 'Handleiding')}
            </button>
            <button
              className="text-[0.85rem] text-[var(--cs-primary)] border border-[var(--cs-primary)] rounded px-2 py-1 inline-flex items-center leading-none disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={visited.length === 0}
              onClick={goToPrevious}
            >
              ← {t('annotate_prev_task', 'Vorige taak')}
            </button>
            <button
              className="text-[0.85rem] text-[var(--cs-primary)] border border-[var(--cs-primary)] rounded px-2 py-1 inline-flex items-center leading-none disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={isLoadingNext}
              onClick={goToNext}
            >
              {t('annotate_next_task', 'Volgende taak')} →
            </button>
          </div>
        </div>
        {firstSaveDone && !isSubmittedTask && (
          <div className="px-4 py-2 bg-sky-50 border-b border-sky-200 text-sky-800 text-[0.85rem] flex-shrink-0 flex items-center justify-between gap-2">
            <span>{t('annotate_autosaved_banner', 'Je voortgang is automatisch bewaard als concept. Deze taak staat op jouw naam tot je ze indient of vrijgeeft.')}</span>
            <button
              className="text-[var(--cs-primary)] underline whitespace-nowrap"
              onClick={() => setReleaseConfirmOpen(true)}
            >
              {t('annotate_release_task', 'Taak vrijgeven')}
            </button>
          </div>
        )}
        <AnnotateLayout
          manifestUrl={manifestUrl}
          osdViewer={
            <OpenSeadragonViewer
              imageServiceId={getImageServiceId(canvasData?.canvas)}
              canvasIndex={canvasIndex}
              totalCanvases={canvases.length}
              onPrevCanvas={canvasIndex > 0 ? () => setCanvasIndex(i => i - 1) : undefined}
              onNextCanvas={canvasIndex < canvases.length - 1 ? () => setCanvasIndex(i => i + 1) : undefined}
              drawingSelector={!!drawingPath}
              onSelectorDrawn={handleSelectorDrawn}
              onCancelDrawing={handleCancelDraw}
              savedSelectors={savedSelectors}
            />
          }
          form={
            <CaptureModelForm
              model={model}
              document={annotationDocument}
              onChange={handleChange}
              onSaveDraft={() => handleSaveDraft()}
              onSubmit={() => handleSaveAndAdvance('submitted')}
              onActiveStructureChange={setActiveStructure}
              saving={saving || advancing}
              confirmation={confirmation}
              drawingPath={drawingPath}
              onRequestDraw={handleRequestDraw}
              onCancelDraw={handleCancelDraw}
              onClearSelector={handleClearSelector}
              readOnly={isSubmittedTask}
              readOnlyBanner={isSubmittedTask ? t('annotate_already_submitted', 'Deze taak is al ingediend en kan niet meer worden gewijzigd.') : undefined}
            />
          }
        />
      </div>

      <ProjectManualModal projectSlug={project.slug} open={manualOpen} onClose={() => setManualOpen(false)} />

      {releaseConfirmOpen && (
        <ConfirmDialog
          message={t('my_tasks_release_confirm')}
          confirmLabel={t('common_delete')}
          cancelLabel={t('common_cancel')}
          onConfirm={() => {
            setReleaseConfirmOpen(false);
            void handleReleaseTask();
          }}
          onCancel={() => setReleaseConfirmOpen(false)}
        />
      )}
    </CsPage>
  );
}
