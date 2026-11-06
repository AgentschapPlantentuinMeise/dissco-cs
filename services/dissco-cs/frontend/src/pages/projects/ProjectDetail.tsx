import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { taskQueries } from '../../api/queries/tasks';
import { projectQueries } from '../../api/queries/projects';
import { useTranslation } from 'react-i18next';
import { useCurrentProject } from '../../hooks/use-current-project';
import { useProjectProgress } from '../../hooks/use-project-progress';
import { useCurrentUser } from '../../hooks/use-current-user';
import { useBackHref } from '../../hooks/use-return-link';
import { projectsApi } from '../../api/cs-client/projects';
import { buildTaskLink } from '../../utility/build-task-link';
import { taskDisplayName } from '../../utility/task-display-name';
import { HrefLink } from '../../utility/href-link';
import { LocaleString } from '../../components/ui/LocaleString';
import { Button } from '../../components/ui/Button';
import { CsPage } from '../../components/layout/CsPage';
import { HeaderImage, PageHeader } from '../../components/layout/PageHeader';
import { ProjectAboutAside } from './ProjectAboutAside';
import { PageSection } from '../../components/layout/PageSection';
import { PageLoadError } from '../../components/layout/PageLoadError';
import { SectionLoadError } from '../../components/layout/SectionLoadError';
import { AboutColumns } from '../../components/layout/AboutColumns';
import { localeText } from '../../utility/locale-text';
import { projectImageUrl } from '../../utility/project-image-url';
import { currentLocation, withQuery } from '../../api/url';
import { ManualModal } from '../../components/manuals/ManualModal';
import { rowHoverClass } from '../../components/ui/list-styles';
import { ProjectForumTopics } from './ProjectForumTopics';
import { usePagedGrid } from '../../hooks/use-paged-grid';
import { useProjectManual } from '../../hooks/use-project-manual';
import { Pagination } from '../../components/ui/Pagination';

function manualSeenKey(projectSlug: string): string {
  return `project-manual-seen-${projectSlug}`;
}

export function ProjectDetail() {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data: project, error: projectError } = useCurrentProject();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [manualOpen, setManualOpen] = useState(false);
  const backToProjects = useBackHref('/explore');

  // The manual opens by itself once per project per browser. It only counts as seen once it was
  // really shown (markManualSeen runs from ManualModal's onShown), so a project that has no manual
  // yet keeps trying on the next visit instead of being marked "seen" silently.
  useEffect(() => {
    if (!project) return;
    if (localStorage.getItem(manualSeenKey(project.slug)) !== '1') {
      setManualOpen(true);
    }
  }, [project?.slug]);

  const markManualSeen = () => {
    if (project) {
      localStorage.setItem(manualSeenKey(project.slug), '1');
    }
  };


  // The "choose where to start" grid leaves out manifests that are done or have their maximum of
  // volunteers (see projectsApi.getProgress) -- with a maximum of 1 that includes the user's own
  // saved task. This separate query shows those saved tasks instead of letting them disappear.
  const { data: ownTasksData } = useQuery({ ...taskQueries.mineSaved(user?.id), enabled: !!project && !!user });
  const ownSavedTasks = (ownTasksData?.tasks ?? []).filter(task => task.metadata?.project?.slug === project?.slug);

  const { data: progress, isError: progressError } = useProjectProgress(project?.id);
  const manifests = progress?.availableManifests ?? [];
  // The tiles are smaller than project cards, so a page holds more rows.
  const manifestGrid = usePagedGrid(manifests, 3);

  const { data: institution } = useQuery(projectQueries.institution(project?.slug));
  const { data: manual } = useProjectManual(project?.slug);

  const navigateToFirstCanvas = async (manifestId: number) => {
    navigate(`/explore/${project!.slug}/manifests/${manifestId}/annotate`);
  };

  const { mutate: startRandom, isPending: isStarting } = useMutation({
    mutationFn: async () => {
      if (!project) return;
      if (!user) {
        // Same clean login redirect as AuthGate (no expired=1) - this is a plain "you need to
        // log in to start", not a session that actually expired.
        navigate(withQuery('/login', { redirect: currentLocation() }));
        return;
      }
      try {
        const result = await projectsApi.randomManifest(project.slug);
        if (result?.manifest) {
          await navigateToFirstCanvas(result.manifest);
        }
      } catch {
        navigate(`/explore/${project.slug}/manifests`);
      }
    },
  });

  if (projectError) {
    return (
      <PageLoadError error={projectError} notFoundText={t('project_not_found')} back={{ href: backToProjects, label: t('projects_all') }} />
    );
  }

  if (!project) {
    return (
      <CsPage>
        <PageSection>
          <p className="py-16 text-center text-gray-500 m-0">{t('pdp_loading')}</p>
        </PageSection>
      </CsPage>
    );
  }

  const transcribedPercentage = progress?.transcribedPercentage || 0;
  const totalTasks = progress?.totalTasks || 0;

  const imageUrl = projectImageUrl(project);
  const allTasksTaken = progress?.allTasksTaken ?? false;
  const showManifests = progressError || allTasksTaken || manifests.length > 0;

  return (
    <CsPage>
      <PageHeader
        variant="split-banner"
        back={{ href: backToProjects, label: t('projects_all') }}
        title={<LocaleString>{project.label}</LocaleString>}
        actions={
          <Button variant="on-dark" onClick={() => startRandom()} loading={isStarting} disabled={allTasksTaken}>
            {isStarting ? t('pdp_starting') : t('pdp_btn_start')}
          </Button>
        }
        stats={[
          { value: progress ? `${transcribedPercentage}%` : '—', label: t('pdp_completed') },
          { value: progress ? totalTasks : '—', label: t('pdp_tasks') },
          { value: progress ? progress.volunteers : '—', label: t('institution_stats_volunteers') },
        ]}
        aside={imageUrl ? <HeaderImage src={imageUrl} /> : undefined}
      >
        <div
          className="h-1.5 max-w-[360px] bg-white/25 rounded-[3px] overflow-hidden"
          role="progressbar"
          aria-label={t('pdp_completed')}
          aria-valuenow={transcribedPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-white transition-[width] duration-[0.6s] ease-in-out" style={{ width: `${transcribedPercentage}%` }} />
        </div>
      </PageHeader>
      <PageSection title={t('pdp_about_title')}>
        <AboutColumns
          text={localeText(project.summary, i18n.language)}
          aside={
            institution || manual ? (
              <ProjectAboutAside institution={institution} onOpenManual={manual ? () => setManualOpen(true) : undefined} />
            ) : undefined
          }
        />
      </PageSection>

      {showManifests && (
        <PageSection tone="white" title={t('pdp_manifests_title')}>
          {progressError && <SectionLoadError />}
          {allTasksTaken && (
            <p className="m-0 px-5 py-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[0.95rem]">
              {t('pdp_all_tasks_taken')}
            </p>
          )}
          {manifests.length > 0 && (
            <div
              ref={manifestGrid.gridRef}
              className="grid [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))] gap-[14px] max-[700px]:[grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]"
            >
              {manifestGrid.pageItems.map(manifest => (
                <button
                  key={manifest.id}
                  onClick={() => navigateToFirstCanvas(manifest.id)}
                  className="flex flex-col bg-white rounded overflow-hidden no-underline text-inherit transition-transform duration-200 border-none p-0 cursor-pointer text-left w-full hover:-translate-y-[3px]"
                >
                  <div
                    className="h-[100px] bg-[#dde8ea] bg-cover bg-center bg-no-repeat"
                    style={manifest.thumbnail ? { backgroundImage: `url(${manifest.thumbnail})` } : undefined}
                  />
                  <LocaleString className="py-[7px] px-[9px] text-[0.78rem] text-[#343a40] leading-[1.35] m-0 line-clamp-2">
                    {manifest.label || t('pdp_manifest_untitled')}
                  </LocaleString>
                </button>
              ))}
            </div>
          )}
          <Pagination
            currentPage={manifestGrid.currentPage}
            totalPages={manifestGrid.totalPages}
            onChange={manifestGrid.setCurrentPage}
            label={t('pdp_manifests_pagination_label')}
          />
        </PageSection>
      )}

      {ownSavedTasks.length > 0 && (
        <PageSection title={t('pdp_saved_tasks_title')}>
          <div className="border-t border-gray-100">
            {ownSavedTasks.map(task => {
              return (
                <HrefLink
                  key={task.id}
                  href={buildTaskLink(task)}
                  className={`block px-4 py-3 text-[0.9rem] text-cs-primary no-underline font-medium border-b border-[#f0f0f0] last:border-b-0 ${rowHoverClass}`}
                >
                  {taskDisplayName(task, user!.name)}
                </HrefLink>
              );
            })}
          </div>
        </PageSection>
      )}

      {user && (
        <ProjectForumTopics
          projectSlug={project.slug}
          // The section above it is white only when the saved tasks are missing and the manifests show.
          tone={ownSavedTasks.length === 0 && showManifests ? 'page' : 'white'}
        />
      )}

      <ManualModal
        projectSlug={project.slug}
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onShown={markManualSeen}
      />
    </CsPage>
  );
}
