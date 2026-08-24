import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { getAllSiteProjects } from '../../api/madoc-client/projects';
import { CsPage } from '../../components/CsPage';
import { ProjectCard } from '../../components/projectcard/ProjectCard';
import { AnnouncementBanner } from '../../components/announcements/AnnouncementBanner';
import { StatBanner } from '../../components/StatBanner';
import { HonourBoardSpotlight } from '../../components/honour-board/HonourBoardSpotlight';
import { useSiteStats } from '../../hooks/use-site-stats';

export const Projects: React.FC = () => {
  // All pages, published-only, so every active project shows regardless of how many draft/paused
  // projects exist (and regardless of whether the viewer is a site-admin, who would otherwise see
  // every status unfiltered -- see useProjectList's `published` option).
  const { data: allProjects, status } = useQuery(['all-site-projects', { published: true }], () =>
    getAllSiteProjects({ published: true })
  );
  const { data: siteStats } = useSiteStats();
  const { t, i18n } = useTranslation('dissco-cs');
  const projects = (allProjects ?? []).filter((p: any) => p.status === 1);
  const isLoadingList = status === 'loading';
  const formatNumber = (n: number) => n.toLocaleString(i18n.language);

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-x-8">

          <header className="mb-8 lg:col-span-2">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-3">{t('projects_title')}</h1>
            <p className="text-lg text-gray-600">{t('projects_intro')}</p>
          </header>

          <div className="lg:col-span-2">
            <AnnouncementBanner target="projects" />
          </div>

          <div className="mt-8 lg:mt-0 lg:col-start-1 lg:row-start-3 lg:self-start flex flex-col">
            <StatBanner
              stats={[
                { value: siteStats ? formatNumber(siteStats.volunteers) : '—', label: t('institution_stats_volunteers') },
                {
                  value: siteStats ? `${formatNumber(siteStats.tasksCompleted)} / ${formatNumber(siteStats.tasksTotal)}` : '—',
                  label: t('honour_board_stat_tasks_label'),
                },
              ]}
            />

            <div className="mt-8">
              {isLoadingList && <p className="text-center py-5">{t('loading_projects')}</p>}
              {!isLoadingList && projects.length === 0 && (
                <p className="text-center py-5">{t('no_projects')}</p>
              )}

              <div className="cs-projects-grid cs-projects-grid--compact">
                {projects.map((project: any) => (
                  <ProjectCard key={project.id} projectSummaryData={project} />
                ))}
              </div>
            </div>
          </div>

          <HonourBoardSpotlight className="mt-8 lg:mt-6 lg:col-start-2 lg:row-start-3 lg:self-start" />

        </div>
      </div>
    </CsPage>
  );
};
