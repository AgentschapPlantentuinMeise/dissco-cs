import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { iiifQueries } from '../../api/queries/iiif';
import { projectQueries } from '../../api/queries/projects';
import { forumKeys } from '../../api/queries/forum';
import { captureModelQueries } from '../../api/queries/capture-models';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/cs-client/request';
import { forumApi } from '../../api/cs-client/forum';
import { useCurrentProject } from '../../hooks/use-current-project';
import { useRouteContext } from '../../hooks/use-route-context';
import { CsPage } from '../../components/layout/CsPage';
import { useLocaleString } from '../../components/ui/LocaleString';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DiscardDialog } from '../../components/ui/DiscardDialog';
import { useDiscardGuard } from '../../hooks/use-discard-guard';
import { useProjectManual } from '../../hooks/use-project-manual';
import { ForumTopicInput, MadocBoxSelectorState } from '@dissco-cs/shared-types';
import { AnnotateLayout } from './AnnotateLayout';
import { OpenSeadragonViewer } from '../../components/iiif/OpenSeadragonViewer';
import { CaptureModelForm } from './form/CaptureModelForm';
import { DocumentPath } from '../../utility/annotation-document';
import { getImageServiceId } from '../../utility/get-image-service-id';
import { isContributorLimitReached } from './claim-errors';
import { useTaskClaim } from './use-task-claim';
import { useAnnotationDocument } from './use-annotation-document';
import { useAnnotationSave } from './use-annotation-save';
import { useTaskNavigation } from './use-task-navigation';
import { useAnnotatePanel } from './use-annotate-panel';
import { useManifestInfo } from './use-manifest-info';
import { collectFieldHelp, helpModelsFor } from './field-help';
import { AnnotateToolbar } from './AnnotateToolbar';
import { AnnotateHelpBar } from './AnnotateHelpBar';
import { AnnotateSidePanel } from './AnnotateSidePanel';
import { AutosaveBanner } from './AutosaveBanner';
import { AnnotatePageError } from './AnnotatePageError';

// The annotate screen: the image, the form, and the help beside it. Only shown on a large enough
// screen (see AnnotatePage).
export function AnnotateScreen() {
  const { t } = useTranslation('dissco-cs');
  const { manifestId } = useRouteContext();
  const { data: project } = useCurrentProject();
  const [projectLabel] = useLocaleString(project?.label);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;

  const panel = useAnnotatePanel();
  const [forumDirty, setForumDirty] = useState(false);
  const forumGuard = useDiscardGuard(forumDirty);
  const [releaseConfirmOpen, setReleaseConfirmOpen] = useState(false);
  const { hasInfo } = useManifestInfo(manifestId);
  const { data: manual } = useProjectManual(project?.slug);

  const [navBottom, setNavBottom] = useState(64);
  useEffect(() => {
    const navbar = document.querySelector('.cs-navbar') as HTMLElement | null;
    if (navbar) setNavBottom(navbar.getBoundingClientRect().bottom);
  }, []);

  const { data: structure, isError: structureError, error: structureErrorObj } = useQuery({
    ...iiifQueries.manifestStructure(manifestId),
    retry: false,
  });
  const canvases = structure?.items ?? [];
  const [canvasIndex, setCanvasIndex] = useState(0);

  const { data: canvas } = useQuery({
    ...iiifQueries.canvas(canvases[canvasIndex]?.id),
  });

  const { data: prepared, isError: preparedError, error: preparedErrorObj } = useQuery({
    ...projectQueries.prepareClaim(project?.id, manifestId),
    retry: false,
  });

  const { data: model, isError: modelError, error: modelErrorObj } = useQuery({
    ...captureModelQueries.model(prepared?.model?.id),
    retry: false,
  });

  const claim = useTaskClaim({
    projectId: project?.id,
    manifestId,
    prepared,
    onLeave: () => autosave.cancelPendingAutosave(),
  });
  const doc = useAnnotationDocument({ model, prepared, projectId: project?.id, manifestId, canvasIndex, revisionId: claim.revisionId });
  const autosave = useAnnotationSave({
    projectId: project?.id,
    manifestId,
    prepared,
    enableAutoSave: !!project?.config?.modelPageOptions?.enableAutoSave,
    model,
    annotationDocument: doc.annotationDocument,
    activeStructure: doc.activeStructure,
    claim,
  });
  const nav = useTaskNavigation({ projectSlug: project?.slug, manifestId, releaseClaim: claim.releaseClaim });

  const help = useMemo(
    () =>
      model && doc.activeStructure && doc.annotationDocument
        ? collectFieldHelp(helpModelsFor(model.structure, doc.activeStructure.id), doc.annotationDocument)
        : { instructions: [], groups: [] },
    [model, doc.activeStructure, doc.annotationDocument]
  );

  // Shows a brief confirmation toast, then moves on to the next task — used for both save actions,
  // so the user always gets feedback that the save succeeded before the page changes under them.
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  // A different task (same dependencies as the claim effect in use-task-claim) starts clean.
  useEffect(() => {
    setConfirmation(null);
    setAdvancing(false);
  }, [project?.id, manifestId, prepared]);

  const handleSaveAndAdvance = async (status: 'draft' | 'submitted') => {
    setAdvancing(true);
    try {
      await autosave.save(status);
    } catch {
      // Already reported and shown by the global MutationCache handler -- stay on this task.
      setAdvancing(false);
      return;
    }
    setConfirmation(status === 'draft' ? t('annotate_saved_draft') : t('annotate_submitted'));
    await new Promise(resolve => setTimeout(resolve, 1200));
    if (returnTo) {
      await nav.handleLeave(returnTo);
    } else {
      await nav.goToNext();
    }
  };

  // Same save as handleSaveAndAdvance('draft') but stays on the current task — no goToNext().
  const handleSaveDraft = async () => {
    try {
      await autosave.save('draft');
    } catch {
      // Already reported and shown by the global MutationCache handler.
      return;
    }
    setConfirmation(t('annotate_saved_draft_24h'));
  };

  // Posts the forum topic, then saves the task as draft and moves on, exactly like a normal draft
  // save (handleSaveAndAdvance).
  const { mutate: postForumTopic } = useMutation({
    mutationFn: (data: ForumTopicInput) =>
      forumApi.createTopic({ ...data, projectSlug: project?.slug ?? null, projectLabel: projectLabel ?? null }),
    onSuccess: () => {
      panel.close();
      queryClient.invalidateQueries({ queryKey: forumKeys.all });
      void handleSaveAndAdvance('draft');
    },
    meta: { errorMessage: 'error_send_failed' },
  });

  const handleReleaseTask = async () => {
    await claim.releaseTask();
    navigate(`/explore/${project?.slug}`);
  };

  // Every edit of the document: apply it, then let the autosave know.
  const handleChange = (path: DocumentPath, value: unknown) => {
    doc.setValue(path, value);
    autosave.markDirty();
  };
  const handleSelectorDrawn = (state: MadocBoxSelectorState) => {
    if (doc.setDrawnSelector(state)) autosave.markDirty();
  };
  const handleClearSelector = (path: DocumentPath) => {
    doc.clearSelector(path);
    autosave.markDirty();
  };

  if (structureError || preparedError || modelError) {
    const err = structureErrorObj || preparedErrorObj || modelErrorObj;
    return (
      <AnnotatePageError
        projectSlug={project?.slug}
        error={
          isContributorLimitReached(err)
            ? { kind: 'full', onNext: nav.goToNext, isLoadingNext: nav.isLoadingNext }
            : { kind: err instanceof ApiError && err.status === 404 ? 'no-access' : 'load' }
        }
      />
    );
  }

  if (prepared && !prepared.model) {
    return <AnnotatePageError projectSlug={project?.slug} error={{ kind: 'no-model' }} />;
  }

  if (!project || !model || !doc.annotationDocument || !manifestId) {
    return (
      <CsPage>
        <p className="py-16 text-center text-gray-500 m-0">{t('pdp_loading')}</p>
      </CsPage>
    );
  }

  const isSubmittedTask = !!prepared && (prepared.claim?.status as number) >= 2;

  return (
    <CsPage fullScreen>
      {/* navBottom is measured from the actual navbar, not guessed, so this section's height
          exactly fills the rest of the viewport — no page-level scrollbar on top of the panel's own. */}
      <div className="flex flex-col" style={{ height: `calc(100vh - ${navBottom}px)` }}>
        <AnnotateToolbar
          projectSlug={project.slug}
          projectLabel={project.label}
          canvasLabel={canvases[canvasIndex]?.label}
          onLeave={to => void nav.handleLeave(to)}
          canGoPrevious={nav.canGoPrevious}
          onPrevious={nav.goToPrevious}
          isLoadingNext={nav.isLoadingNext}
          onNext={nav.goToNext}
        />
        {autosave.firstSaveDone && !isSubmittedTask && <AutosaveBanner onRelease={() => setReleaseConfirmOpen(true)} />}
        <AnnotateLayout
          osdViewer={
            <OpenSeadragonViewer
              imageServiceId={getImageServiceId(canvas)}
              canvasIndex={canvasIndex}
              totalCanvases={canvases.length}
              onPrevCanvas={canvasIndex > 0 ? () => setCanvasIndex(i => i - 1) : undefined}
              onNextCanvas={canvasIndex < canvases.length - 1 ? () => setCanvasIndex(i => i + 1) : undefined}
              drawingSelector={!!doc.drawingPath}
              onSelectorDrawn={handleSelectorDrawn}
              onCancelDrawing={doc.cancelDraw}
              savedSelectors={doc.savedSelectors}
            />
          }
          form={
            <CaptureModelForm
              model={model}
              document={doc.annotationDocument}
              onChange={handleChange}
              onSaveDraft={() => handleSaveDraft()}
              onSubmit={() => handleSaveAndAdvance('submitted')}
              onActiveStructureChange={doc.setActiveStructure}
              saving={autosave.saving || advancing}
              confirmation={confirmation}
              drawingPath={doc.drawingPath}
              onRequestDraw={doc.requestDraw}
              onCancelDraw={doc.cancelDraw}
              onClearSelector={handleClearSelector}
              readOnly={isSubmittedTask}
              readOnlyBanner={isSubmittedTask ? t('annotate_already_submitted') : undefined}
              onShowHelp={key => forumGuard.guard(() => panel.showHelp(key))}
            />
          }
          panel={
            panel.open && (
              <AnnotateSidePanel
                kind={panel.open}
                onClose={() => forumGuard.guard(panel.close)}
                help={help}
                helpTarget={panel.helpTarget}
                manifestId={manifestId}
                projectSlug={project.slug}
                projectLabel={projectLabel}
                onPostForum={data => postForumTopic(data)}
                onForumDirtyChange={setForumDirty}
              />
            )
          }
          helpBar={<AnnotateHelpBar open={panel.open} onToggle={kind => forumGuard.guard(() => panel.toggle(kind))} hidden={{ forum: isSubmittedTask, info: !hasInfo, manual: !manual }} />}
        />
      </div>

      {releaseConfirmOpen && (
        <ConfirmDialog
          title={t('my_tasks_release_confirm_title')}
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

      <DiscardDialog guard={forumGuard} />
    </CsPage>
  );
}
