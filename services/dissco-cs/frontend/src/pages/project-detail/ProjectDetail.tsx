import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { taskQueries } from '../../api/queries/tasks';
import { projectQueries } from '../../api/queries/projects';
import { useTranslation } from 'react-i18next';
import { useCurrentProject } from '../../hooks/use-current-project';
import { useProjectProgress } from '../../hooks/use-project-progress';
import { useCurrentUser } from '../../hooks/use-current-user';
import { projectsApi } from '../../api/cs-client/projects';
import { MadocInternationalString } from '@dissco-cs/shared-types';
import { buildTaskLink } from '../../utility/build-task-link';
import { HrefLink } from '../../utility/href-link';
import { LocaleString } from '../../components/ui/LocaleString';
import { Button } from '../../components/ui/Button';
import { CsPage } from '../../components/layout/CsPage';
import { currentLocation, withQuery } from '../../api/url';
import { AnnouncementBanner } from '../../components/announcements/AnnouncementBanner';
import { ManualModal } from '../../components/manuals/ManualModal';

function manualSeenKey(projectSlug: string): string {
  return `project-manual-seen-${projectSlug}`;
}

export function ProjectDetail() {
  const { t } = useTranslation('dissco-cs');
  const { data: project } = useCurrentProject();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [manualOpen, setManualOpen] = useState(false);

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

  const { data: progress } = useProjectProgress(project?.id);

  const { data: institution } = useQuery(projectQueries.institution(project?.slug));

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

  if (!project) {
    return (
      <CsPage>
        <div className="cs-main-wrapper pt-10 pb-16">
          <div className="cs-container cs-container--wide py-16 text-center text-gray-500">
            <p>{t('pdp_loading')}</p>
          </div>
        </div>
      </CsPage>
    );
  }

  const transcribedPercentage = progress?.transcribedPercentage || 0;
  const totalTasks = progress?.totalTasks || 0;

  const imageUrl = project.placeholderImage || null;
  const manifests = progress?.availableManifests ?? [];
  const allTasksTaken = progress?.allTasksTaken ?? false;

  return (
    <CsPage>
      <div className="cs-main-wrapper">
        <div className="cs-container cs-container--wide pt-10 pb-12">

          <div className="grid [grid-template-columns:45%_55%] min-h-[340px] rounded-[10px] overflow-hidden mb-10 max-[700px]:grid-cols-1 max-[700px]:min-h-0">

            <div
              className="relative bg-[#c8dfe2] bg-cover bg-center bg-no-repeat min-h-[280px] max-[700px]:min-h-[200px]"
              style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
            >
              <div className="absolute bottom-0 left-0 right-0 bg-[linear-gradient(transparent,rgba(0,0,0,0.72))] px-4 pb-[14px] pt-7 text-white">
                <div className="grid grid-cols-2 gap-2 text-center text-[0.75rem] mb-[6px] opacity-90">
                  <div>
                    <div className="text-base font-bold">{transcribedPercentage}%</div>
                    <div>{t('pdp_completed')}</div>
                  </div>
                  <div>
                    <div className="text-base font-bold">{totalTasks}</div>
                    <div>{t('pdp_tasks')}</div>
                  </div>
                </div>
                <div className="h-[6px] bg-white/30 rounded-[3px] overflow-hidden">
                  <div
                    className="h-full bg-white rounded-[3px] transition-[width] duration-[0.6s] ease-in-out"
                    style={{ width: `${transcribedPercentage}%` }}
                    role="progressbar"
                    aria-valuenow={transcribedPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white py-9 px-8 flex flex-col justify-center max-[700px]:py-6 max-[700px]:px-5">
              {institution?.logo && (
                <div
                  className="h-16 max-w-[220px] bg-contain bg-left bg-no-repeat mb-4"
                  style={{ backgroundImage: `url(${institution.logo})` }}
                />
              )}
              <LocaleString as="h1" className="text-[1.8rem] font-bold text-cs-primary mt-0 mb-[14px] leading-[1.25] max-[700px]:text-[1.4rem]">
                {project.label}
              </LocaleString>
              <LocaleString as="p" className="text-base leading-relaxed text-gray-600 mb-7 flex-grow">
                {project.summary}
              </LocaleString>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => startRandom()} loading={isStarting} disabled={allTasksTaken}>
                  {isStarting ? t('pdp_starting') : t('pdp_btn_start')}
                </Button>
                <Button variant="secondary" onClick={() => setManualOpen(true)}>
                  {t('pdp_btn_guide')}
                </Button>
              </div>
            </div>

          </div>

          <AnnouncementBanner target="project" projectSlug={project.slug} />

          {allTasksTaken && (
            <div className="mb-6 px-5 py-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[0.95rem]">
              {t('pdp_all_tasks_taken')}
            </div>
          )}

          {manifests.length > 0 && (
            <section className="mb-10">
              <h2 className="text-[1.2rem] font-semibold text-cs-primary mt-0 mb-5">{t('pdp_manifests_title')}</h2>
              <div className="grid [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))] gap-[14px] max-[700px]:[grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]">
                {manifests.map(manifest => (
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
                      {(manifest.label as string | MadocInternationalString | undefined) || 'Naamloos'}
                    </LocaleString>
                  </button>
                ))}
              </div>
            </section>
          )}

          {ownSavedTasks.length > 0 && (
            <section className="mb-4">
              <h2 className="text-[1.2rem] font-semibold text-cs-primary mt-0 mb-5">{t('pdp_saved_tasks_title')}</h2>
              <div className="bg-white rounded-[10px] overflow-hidden">
                {ownSavedTasks.map(task => {
                  const href = buildTaskLink(task);
                  const prefix = user!.name + ': ';
                  const displayName = task.name?.startsWith(prefix) ? task.name.slice(prefix.length) : task.name;
                  return (
                    <HrefLink
                      key={task.id}
                      href={href}
                      className="block px-4 py-3 text-[0.9rem] text-cs-primary no-underline font-medium border-b border-[#f0f0f0] last:border-b-0 hover:bg-gray-50"
                    >
                      {displayName}
                    </HrefLink>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      </div>

      <ManualModal
        projectSlug={project.slug}
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onShown={markManualSeen}
      />
    </CsPage>
  );
}
