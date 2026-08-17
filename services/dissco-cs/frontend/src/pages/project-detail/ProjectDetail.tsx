import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { useProject } from '../../hooks/use-project';
import { useProjectProgress } from '../../hooks/use-project-progress';
import { useRouteContext } from '../../hooks/use-route-context';
import { useUser } from '../../hooks/use-current-user';
import { madocClient } from '../../api/madoc-client';
import { institutionsApi } from '../../api/cs-api';
import { CrowdsourcingTask } from '../../types/crowdsourcing-task';
import { buildTaskLink } from '../../utility/build-task-link';
import { HrefLink } from '../../utility/href-link';
import { LocaleString } from '../../components/LocaleString';
import { CsPage } from '../../components/CsPage';
import { AnnouncementBanner } from '../../components/announcements/AnnouncementBanner';
import { ProjectManualModal } from '../../components/ProjectManualModal';
import { disscoCSConfig } from '../../dissco-cs-config';

function manualSeenKey(projectSlug: string): string {
  return `project-manual-seen-${projectSlug}`;
}

export const ProjectDetail: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const { data: project } = useProject();
  const user = useUser();
  const navigate = useNavigate();
  const [manualOpen, setManualOpen] = useState(false);

  // Auto-opens once per project per browser (AC2/AC3): only actually shows if the project
  // has a manual linked — ProjectManualModal renders nothing otherwise, and markManualSeen
  // is only called from its onShown callback, so a project without a manual (yet) keeps
  // trying next visit instead of silently marking itself "seen".
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


  // "Kies zelf waar je aan wilt starten" verbergt manifesten met status 1/2/3 zodat twee
  // gebruikers hetzelfde manifest niet tegelijk kunnen claimen (zie docs/MANIFEST-CLAIMS.md) —
  // maar dat verbergt ook de eigen opgeslagen taken (status 1) van de ingelogde gebruiker voor
  // zichzelf. Aparte query zodat die apart getoond kunnen worden i.p.v. te verdwijnen.
  const { data: ownTasksData } = useQuery(
    ['project-own-saved-tasks', project?.id, user?.id],
    () =>
      madocClient.getTasks<CrowdsourcingTask>(1, {
        type: 'crowdsourcing-task',
        all_tasks: true,
        assignee: `urn:madoc:user:${user!.id}`,
        per_page: 100,
        status: 1,
        detail: true,
      }),
    { enabled: !!project && !!user }
  );
  const ownSavedTasks = (ownTasksData?.tasks ?? []).filter(task => task.metadata?.project?.slug === project?.slug);
  console.log('[ProjectDetail] eigen opgeslagen taken in dit project (status 1):', ownSavedTasks.length, ownSavedTasks.map(task => ({
    id: task.id, name: task.name, subject: task.subject,
  })));

  const { data: progress } = useProjectProgress(project?.id);

  const { data: institution } = useQuery(
    ['project-institution', project?.slug],
    () => institutionsApi.getForProject(project!.slug),
    { enabled: !!project }
  );

  const navigateToFirstCanvas = async (manifestId: number) => {
    navigate(`/explore/${project!.slug}/manifests/${manifestId}/annotate`);
  };

  const [startRandom, { isLoading: isStarting }] = useMutation(async () => {
    if (!project) return;
    try {
      const result = await madocClient.randomlyAssignedManifest(project.slug, {});
      if (result?.manifest) {
        await navigateToFirstCanvas(result.manifest);
      }
    } catch {
      navigate(`/explore/${project.slug}/manifests`);
    }
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
        <div className="cs-container cs-container--wide pt-20 pb-12">

          <div className="grid [grid-template-columns:45%_55%] min-h-[340px] rounded-[10px] overflow-hidden mt-10 mb-10 max-[700px]:grid-cols-1 max-[700px]:min-h-0">

            <div
              className="relative bg-[#c8dfe2] bg-cover bg-center bg-no-repeat min-h-[280px] max-[700px]:min-h-[200px]"
              style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
            >
              <div className="absolute bottom-0 left-0 right-0 bg-[linear-gradient(transparent,rgba(0,0,0,0.72))] px-4 pb-[14px] pt-7 text-white">
                <div className="grid grid-cols-2 gap-2 text-center text-[0.75rem] mb-[6px] opacity-90">
                  <div>
                    <div className="text-base font-bold">{transcribedPercentage}%</div>
                    <div>{t('pdp_transcribed')}</div>
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
              <LocaleString as="h1" className="text-[1.8rem] font-bold text-[var(--cs-primary)] mt-0 mb-[14px] leading-[1.25] max-[700px]:text-[1.4rem]">
                {project.label}
              </LocaleString>
              <LocaleString as="p" className="text-base leading-relaxed text-gray-600 mb-7 flex-grow">
                {project.summary}
              </LocaleString>
              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-block py-[11px] px-[26px] bg-[var(--cs-primary)] text-white text-[0.95rem] font-semibold border-none rounded cursor-pointer no-underline transition-[background-color,transform] duration-200 hover:bg-[var(--cs-dark)] hover:-translate-y-[1px] disabled:opacity-65 disabled:cursor-not-allowed"
                  onClick={() => startRandom()}
                  disabled={isStarting || allTasksTaken}
                >
                  {isStarting ? t('pdp_starting') : t('pdp_btn_start')}
                </button>
                <button
                  className="inline-block py-[11px] px-[26px] bg-transparent text-[var(--cs-primary)] text-[0.95rem] font-semibold border-2 border-[var(--cs-primary)] rounded cursor-pointer no-underline transition-[background-color,color,transform] duration-200 hover:bg-[var(--cs-primary)] hover:text-white hover:-translate-y-[1px]"
                  onClick={() => setManualOpen(true)}
                >
                  {t('pdp_btn_guide')}
                </button>
              </div>
            </div>

          </div>

          <AnnouncementBanner target="project" projectSlug={project.slug} />

          {allTasksTaken && (
            <div className="mb-6 px-5 py-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[0.95rem]">
              {t('pdp_all_tasks_taken', 'Alle taken zijn momenteel in behandeling of afgerond. Er zijn geen nieuwe taken beschikbaar.')}
            </div>
          )}

          {manifests.length > 0 && (
            <section className="mb-10">
              <h2 className="text-[1.2rem] font-semibold text-[var(--cs-primary)] mt-0 mb-5">{t('pdp_manifests_title')}</h2>
              <div className="grid [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))] gap-[14px] max-[700px]:[grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]">
                {manifests.map((manifest: any) => (
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
                      {manifest.label || 'Naamloos'}
                    </LocaleString>
                  </button>
                ))}
              </div>
            </section>
          )}

          {ownSavedTasks.length > 0 && (
            <section className="mb-4">
              <h2 className="text-[1.2rem] font-semibold text-[var(--cs-primary)] mt-0 mb-5">{t('pdp_saved_tasks_title')}</h2>
              <div className="bg-white rounded-[10px] overflow-hidden">
                {ownSavedTasks.map(task => {
                  const href = buildTaskLink(task);
                  const prefix = user!.name + ': ';
                  const displayName = task.name?.startsWith(prefix) ? task.name.slice(prefix.length) : task.name;
                  return (
                    <HrefLink
                      key={task.id}
                      href={href}
                      className="block px-4 py-3 text-[0.9rem] text-[var(--cs-primary)] no-underline font-medium border-b border-[#f0f0f0] last:border-b-0 hover:bg-gray-50"
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

      <ProjectManualModal
        projectSlug={project.slug}
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onShown={markManualSeen}
      />
    </CsPage>
  );
};
