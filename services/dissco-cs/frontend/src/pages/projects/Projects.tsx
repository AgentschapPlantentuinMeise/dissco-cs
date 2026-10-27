import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { shuffle } from 'lodash-es';
import { useQuery } from '@tanstack/react-query';
import { projectQueries } from '../../api/queries/projects';
import { CsPage } from '../../components/layout/CsPage';
import { PageLoadError } from '../../components/layout/PageLoadError';
import { ProjectCard } from '../../components/projects/ProjectCard';
import { HeaderMosaic, PageHeader } from '../../components/layout/PageHeader';
import { HonourBoardBand } from '../../components/stats/HonourBoardBand';
import { useSiteHonourBoard } from '../../hooks/use-site-honour-board';
import { useSiteStats } from '../../hooks/use-site-stats';
import { usePagedGrid } from '../../hooks/use-paged-grid';
import { PageSection } from '../../components/layout/PageSection';
import { Pagination } from '../../components/ui/Pagination';
import { formatNumber } from '../../utility/format-number';
import { localeText } from '../../utility/locale-text';
import { projectImageUrl } from '../../utility/project-image-url';
import { MadocProjectDto } from '@dissco-cs/shared-types';

const ROWS_PER_PAGE = 2;

export function Projects() {
  // All pages, published-only, so every active project shows regardless of how many draft/paused
  // projects exist (and regardless of whether the viewer is a site-admin, who would otherwise see
  // every status unfiltered -- see projectsApi.list's `published` filter).
  const { data: allProjects, status } = useQuery({
    ...projectQueries.listAll({ published: true }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: siteStats } = useSiteStats();
  const honourBoard = useSiteHonourBoard();
  const { t, i18n } = useTranslation('dissco-cs');
  const projects = (allProjects ?? []).filter((p: MadocProjectDto) => p.status === 1);
  const isLoadingList = status === 'pending';

  const { gridRef, pageItems, currentPage, totalPages, setCurrentPage } = usePagedGrid(projects, ROWS_PER_PAGE);
  // A random pick for the header, not the first projects of the list -- those are right below it.
  // Shuffled once per load of the list, so a resize does not swap the pictures.
  const mosaicProjects = useMemo(
    () => shuffle((allProjects ?? []).filter((p: MadocProjectDto) => p.status === 1)),
    [allProjects]
  );

  if (status === 'error') {
    return <PageLoadError />;
  }

  return (
    <CsPage>
      <PageHeader
        variant="split-banner"
        title={t('projects_title')}
        lead={t('projects_intro')}
        stats={[
          { value: isLoadingList ? '—' : formatNumber(projects.length, i18n.language), label: t('projects_stat_running') },
          {
            value: siteStats ? formatNumber(Math.max(0, siteStats.tasksTotal - siteStats.tasksCompleted), i18n.language) : '—',
            label: t('projects_stat_open'),
          },
        ]}
        aside={
          <HeaderMosaic
            items={mosaicProjects.map((project: MadocProjectDto) => ({
              href: `/explore/${project.slug}`,
              label: localeText(project.label, i18n.language) || project.slug,
              image: projectImageUrl(project),
            }))}
          />
        }
      />
      <PageSection
        title={t('projects_section_title')}
        intro={isLoadingList ? undefined : t('projects_section_intro', { count: projects.length })}
      >
        {isLoadingList && <p className="text-gray-600 m-0">{t('loading_projects')}</p>}
        {!isLoadingList && projects.length === 0 && <p className="text-gray-600 m-0">{t('no_projects')}</p>}
        <div ref={gridRef} className="cs-card-grid">
          {pageItems.map((project: MadocProjectDto) => (
            <ProjectCard key={project.id} projectSummaryData={project} />
          ))}
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} label={t('projects_pagination_label')} />
      </PageSection>

      <HonourBoardBand board={honourBoard} />
    </CsPage>
  );
}
