import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../../api/cs-client/projects';
import { CsPage } from '../../components/CsPage';
import { ProjectCard } from '../../components/projectcard/ProjectCard';
import { AnnouncementBanner } from '../../components/announcements/AnnouncementBanner';
import { StatBanner } from '../../components/StatBanner';
import { HonourBoardSpotlight } from '../../components/honour-board/HonourBoardSpotlight';
import { useSiteStats } from '../../hooks/use-site-stats';
import { useGridColumnCount } from '../../hooks/use-grid-column-count';
import { formatNumber } from '../../utility/format-number';
import { MadocProjectDto } from '@dissco-cs/shared-types';

// Rijen i.p.v. een vast aantal kaarten, zodat elke pagina een volledig gevulde grid toont ongeacht
// hoeveel kolommen er op het scherm passen (zie useGridColumnCount).
const ROWS_PER_PAGE = 2;

export const Projects: React.FC = () => {
  // All pages, published-only, so every active project shows regardless of how many draft/paused
  // projects exist (and regardless of whether the viewer is a site-admin, who would otherwise see
  // every status unfiltered -- see useProjectList's `published` option).
  const { data: allProjects, status } = useQuery({
    queryKey: ['all-site-projects', { published: true }],
    queryFn: () => projectsApi.listAll({ published: true }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: siteStats } = useSiteStats();
  const { t, i18n } = useTranslation('dissco-cs');
  const projects = (allProjects ?? []).filter((p: MadocProjectDto) => p.status === 1);
  const isLoadingList = status === 'pending';

  const [gridRef, columns] = useGridColumnCount<HTMLDivElement>();
  const pageSize = columns * ROWS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(projects.length / pageSize));
  const [currentPage, setCurrentPage] = useState(1);

  // Alleen begrenzen (niet hard resetten naar 1): anders duwt elke kolomherberekening -- bv. een
  // scrollbar die na een paginawissel verschijnt/verdwijnt -- de gebruiker terug naar pagina 1,
  // wat de net geannuleerde kaarten van die pagina meteen opnieuw zou mounten en ophalen.
  useEffect(() => {
    setCurrentPage(p => Math.min(p, totalPages));
  }, [totalPages]);

  const pagedProjects = projects.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
                { value: siteStats ? formatNumber(siteStats.volunteers, i18n.language) : '—', label: t('institution_stats_volunteers') },
                {
                  value: siteStats ? `${formatNumber(siteStats.tasksCompleted, i18n.language)} / ${formatNumber(siteStats.tasksTotal, i18n.language)}` : '—',
                  label: t('honour_board_stat_tasks_label'),
                },
              ]}
            />

            <div className="mt-8">
              {isLoadingList && <p className="text-center py-5">{t('loading_projects')}</p>}
              {!isLoadingList && projects.length === 0 && (
                <p className="text-center py-5">{t('no_projects')}</p>
              )}

              <div ref={gridRef} className="cs-projects-grid cs-projects-grid--compact">
                {pagedProjects.map((project: MadocProjectDto) => (
                  <ProjectCard key={project.id} projectSummaryData={project} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  className="mt-8 flex justify-center items-center gap-2 flex-wrap"
                  aria-label={t('projects_pagination_label')}
                >
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="py-2 px-4 text-sm font-medium text-[var(--cs-primary)] bg-transparent border border-[var(--cs-primary)] rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--cs-primary)] hover:text-white"
                  >
                    {t('projects_pagination_prev')}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      aria-current={page === currentPage ? 'page' : undefined}
                      aria-label={t('projects_pagination_page', { page })}
                      className={
                        page === currentPage
                          ? 'w-9 h-9 text-sm font-semibold text-white bg-[var(--cs-primary)] border border-[var(--cs-primary)] rounded cursor-pointer'
                          : 'w-9 h-9 text-sm font-medium text-[var(--cs-primary)] bg-transparent border border-transparent rounded cursor-pointer hover:border-[var(--cs-primary)]'
                      }
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="py-2 px-4 text-sm font-medium text-[var(--cs-primary)] bg-transparent border border-[var(--cs-primary)] rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--cs-primary)] hover:text-white"
                  >
                    {t('projects_pagination_next')}
                  </button>
                </nav>
              )}
            </div>
          </div>

          <HonourBoardSpotlight className="mt-8 lg:mt-0 lg:col-start-2 lg:row-start-3" />

        </div>
      </div>
    </CsPage>
  );
};
