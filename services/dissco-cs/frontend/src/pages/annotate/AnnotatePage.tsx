import { useEffect, useState } from 'react';
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
import { ManualModal } from '../../components/manuals/ManualModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { ForumTopicForm } from '../../components/forum/ForumTopicForm';
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
import { AnnotateToolbar } from './AnnotateToolbar';
import { AutosaveBanner } from './AutosaveBanner';
import { AnnotatePageError } from './AnnotatePageError';

export function AnnotatePage() {
  const { t } = useTranslation('dissco-cs');
  const { manifestId } = useRouteContext();
  const { data: project } = useCurrentProject();
  const [projectLabel] = useLocaleString(project?.label);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;

  const [manualOpen, setManualOpen] = useState(false);
  const [forumOpen, setForumOpen] = useState(false);
  const [releaseConfirmOpen, setReleaseConfirmOpen] = useState(false);

  const [navBottom, setNavBottom] = useState(70);
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

  const { data: canvasData } = useQuery({
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

  // Posts the forum topic, then hands off to the same save-as-draft-and-advance flow used
  // elsewhere (handleSaveAndAdvance) — the task lands in "Saved tasks" and the user proceeds to
  // returnTo (if they came from their saved-tasks list) or the next task, exactly like a normal
  // draft save.
  const { mutate: postForumTopic } = useMutation({
    mutationFn: (data: ForumTopicInput) =>
      forumApi.createTopic({ ...data, projectSlug: project?.slug ?? null, projectLabel: projectLabel ?? null }),
    onSuccess: () => {
      setForumOpen(false);
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

  if (!project || !model || !doc.annotationDocument) {
    return (
      <CsPage>
        <div className="cs-main-wrapper py-16 text-center text-gray-500">{t('pdp_loading')}</div>
      </CsPage>
    );
  }

  const isSubmittedTask = !!prepared && (prepared.claim?.status as number) >= 2;

  return (
    <CsPage>
      {/* navBottom is measured from the actual navbar, not guessed, so this section's height
          exactly fills the rest of the viewport — no page-level scrollbar on top of the panel's own. */}
      <div className="flex flex-col" style={{ height: `calc(100vh - ${navBottom}px)` }}>
        <AnnotateToolbar
          projectSlug={project.slug}
          projectLabel={project.label}
          canvasLabel={canvases[canvasIndex]?.label}
          onLeave={to => void nav.handleLeave(to)}
          onOpenManual={() => setManualOpen(true)}
          onOpenForum={isSubmittedTask ? null : () => setForumOpen(true)}
          canGoPrevious={nav.canGoPrevious}
          onPrevious={nav.goToPrevious}
          isLoadingNext={nav.isLoadingNext}
          onNext={nav.goToNext}
        />
        {autosave.firstSaveDone && !isSubmittedTask && <AutosaveBanner onRelease={() => setReleaseConfirmOpen(true)} />}
        <AnnotateLayout
          osdViewer={
            <OpenSeadragonViewer
              imageServiceId={getImageServiceId(canvasData?.canvas)}
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
            />
          }
        />
      </div>

      <ManualModal projectSlug={project.slug} open={manualOpen} onClose={() => setManualOpen(false)} />

      <Modal open={forumOpen} onClose={() => setForumOpen(false)} eyebrow={t('nav_forum')} size="lg">
        <ForumTopicForm
          initialTaskUrl={window.location.href}
          taskUrlReadOnly
          fixedProjectLabel={projectLabel}
          onSubmit={data => postForumTopic(data)}
          onCancel={() => setForumOpen(false)}
        />
      </Modal>

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
    </CsPage>
  );
}
