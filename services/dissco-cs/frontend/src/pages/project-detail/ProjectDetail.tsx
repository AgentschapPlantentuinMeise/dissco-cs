import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { useProject } from '../../hooks/use-project';
import { useRouteContext } from '../../hooks/use-route-context';
import { madocClient } from '../../api/madoc-client';
import { projectProgressApi, ProjectProgress } from '../../api/cs-api';
import { LocaleString } from '../../components/LocaleString';
import { CsPage } from '../../components/CsPage';
import { AnnouncementBanner } from '../../components/announcements/AnnouncementBanner';
import { disscoCSConfig } from '../../dissco-cs-config';

export const ProjectDetail: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const { data: project } = useProject();
  const navigate = useNavigate();


  const { data: notStartedCollection } = useQuery(
    ['collection', project?.collection_id],
    () =>
      madocClient.getSiteCollection(project!.collection_id, {
        type: 'manifest',
        project_id: project!.slug,
        hide_status: '1,2,3',
      }),
    { enabled: !!project }
  );

  const { data: progress } = useQuery<ProjectProgress>(
    ['project-progress', project?.id],
    () => projectProgressApi.get(project!.id),
    { enabled: !!project, staleTime: 60000 }
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
          <div className="cs-container py-16 text-center text-gray-500">
            <p>{t('pdp_loading')}</p>
          </div>
        </div>
      </CsPage>
    );
  }

  const transcribedPercentage = progress?.transcribedPercentage || 0;
  const totalTasks = progress?.totalTasks || 0;

  const imageUrl = project.placeholderImage || null;
  const manifests = notStartedCollection?.collection?.items ?? [];
  const totalManifests = notStartedCollection?.collection?.itemCount ?? 0;
  const allTasksTaken = notStartedCollection !== undefined && manifests.length === 0 && totalManifests > 0;

  return (
    <CsPage>
      <div className="cs-main-wrapper">
        <div className="cs-container pt-20 pb-12">

          <div className="grid [grid-template-columns:45%_55%] min-h-[340px] rounded-[10px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.1)] mt-10 mb-10 max-[700px]:grid-cols-1 max-[700px]:min-h-0">

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
                <a
                  className="inline-block py-[11px] px-[26px] bg-transparent text-[var(--cs-primary)] text-[0.95rem] font-semibold border-2 border-[var(--cs-primary)] rounded cursor-pointer no-underline transition-[background-color,color,transform] duration-200 hover:bg-[var(--cs-primary)] hover:text-white hover:-translate-y-[1px]"
                  href="/help"
                >
                  {t('pdp_btn_guide')}
                </a>
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
            <section className="mb-4">
              <h2 className="text-[1.2rem] font-semibold text-[var(--cs-primary)] mt-0 mb-5">{t('pdp_manifests_title')}</h2>
              <div className="grid [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))] gap-[14px] max-[700px]:[grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]">
                {manifests.map((manifest: any) => (
                  <button
                    key={manifest.id}
                    onClick={() => navigateToFirstCanvas(manifest.id)}
                    className="flex flex-col bg-white rounded overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.07)] no-underline text-inherit transition-[transform,box-shadow] duration-200 border-none p-0 cursor-pointer text-left w-full hover:-translate-y-[3px] hover:shadow-[0_6px_14px_rgba(0,0,0,0.12)]"
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

        </div>
      </div>
    </CsPage>
  );
};
