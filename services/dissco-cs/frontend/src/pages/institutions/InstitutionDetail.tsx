import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { institutionQueries } from '../../api/queries/institutions';
import { projectQueries } from '../../api/queries/projects';
import { CsPage } from '../../components/layout/CsPage';
import { HeaderLogo, PageHeader } from '../../components/layout/PageHeader';
import { LuMail, LuPhone, LuGlobe, LuMedal } from 'react-icons/lu';
import { HonourBoardBand } from '../../components/stats/HonourBoardBand';
import { PageSection } from '../../components/layout/PageSection';
import { PageLoadError } from '../../components/layout/PageLoadError';
import { SectionLoadError } from '../../components/layout/SectionLoadError';
import { AboutColumns } from '../../components/layout/AboutColumns';
import { useInstitutionStats } from './use-institution-stats';
import { useInstitutionHonourBoard } from './use-institution-honour-board';
import { ProjectCard } from '../../components/projects/ProjectCard';
import { useBackHref } from '../../hooks/use-return-link';
import { siteLangText } from '../../utility/site-lang-text';
import { formatNumber as formatCount } from '../../utility/format-number';
import { MadocProjectDto } from '@dissco-cs/shared-types';
import { usePagedGrid } from '../../hooks/use-paged-grid';
import { Pagination } from '../../components/ui/Pagination';

// Same as the Projects page.
const ROWS_PER_PAGE = 2;

export function InstitutionDetail() {
  const { t, i18n } = useTranslation('dissco-cs');
  const { slug } = useParams<{ slug: string }>();
  const { data: institution, isLoading, error } = useQuery(institutionQueries.detail(slug));

  const { data: projectSlugs = [], isPending: projectSlugsPending, isError: projectSlugsError } = useQuery(
    institutionQueries.projectSlugs(slug)
  );

  // All pages, published-only -- same reasoning as Homepage/Projects.tsx: a site-admin viewer
  // otherwise gets every status unfiltered from page 1 only, which can miss this institution's
  // linked projects entirely if enough other/older projects exist.
  const { data: allProjects, isPending: allProjectsPending, isError: allProjectsError } = useQuery({
    ...projectQueries.listAll({ published: true }),
    staleTime: 5 * 60 * 1000,
  });
  const linkedProjects = (allProjects ?? []).filter((p: MadocProjectDto) => projectSlugs.includes(p.slug));
  const { gridRef, pageItems, currentPage, totalPages, setCurrentPage } = usePagedGrid(linkedProjects, ROWS_PER_PAGE);

  const { data: overview } = useInstitutionStats(slug);
  const honourBoard = useInstitutionHonourBoard(slug);
  const tasksCompletedPct = overview && overview.tasksTotal > 0 ? Math.round((overview.tasksCompleted / overview.tasksTotal) * 100) : 0;
  const legendLeader = honourBoard.legend.data?.top[0];

  const backToInstitutions = useBackHref('/institutions');

  const formatNumber = (n: number) => formatCount(n, i18n.language);
  const displayUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const hasContact = institution && (institution.email || institution.phone || institution.website);
  const name = institution ? siteLangText(institution.name, i18n.language, '') : '';
  const description = institution ? siteLangText(institution.description, i18n.language, '') : '';

  if (error) {
    return (
      <PageLoadError
        error={error}
        notFoundText={t('institution_not_found')}
        back={{ href: backToInstitutions, label: t('institutions_all') }}
      />
    );
  }

  if (isLoading || !institution) {
    return (
      <CsPage>
        <div className="cs-container cs-container--wide py-10">
          <p className="text-center text-gray-600">{isLoading ? t('loading_projects') : t('institution_not_found')}</p>
        </div>
      </CsPage>
    );
  }

  return (
    <CsPage>
      <PageHeader
        variant="split-banner"
        back={{ href: backToInstitutions, label: t('institutions_all') }}
        title={name}
        stats={[
          {
            value: `${tasksCompletedPct}%`,
            label: t('pdp_completed'),
            note: overview ? `${formatNumber(overview.tasksTotal)} ${t('institution_progress_tasks')}` : undefined,
          },
          { value: overview ? overview.projectsActive : '—', label: t('institution_projects_active') },
          { value: overview ? overview.projectsCompleted : '—', label: t('institution_projects_completed') },
          { value: overview ? formatNumber(overview.volunteers) : '—', label: t('institution_stats_volunteers') },
        ]}
        aside={institution.logo ? <HeaderLogo src={institution.logo} alt={name} /> : undefined}
      >
        {legendLeader && (
          <div className="flex items-center gap-2 text-sm text-white/85">
            <LuMedal className="w-[18px] h-[18px]" aria-hidden="true" />
            <span>{t('honour_board_legend_headline', { name: legendLeader.name, value: formatNumber(legendLeader.count) })}</span>
          </div>
        )}
      </PageHeader>

      {/* The description gets its own section, not the header: a long one made the teal panel tower
          over the page. The contact details sit beside it. */}
      {(description || hasContact) && (
        <PageSection title={t('institution_about_title', { name })}>
          <AboutColumns
            text={description}
            aside={
              hasContact && (
                <div className="flex flex-col gap-3 text-[0.95rem] text-gray-700">
                  {institution.email && (
                    <a className="inline-flex items-center gap-2.5 no-underline text-gray-700 hover:text-cs-primary" href={`mailto:${institution.email}`}>
                      <LuMail aria-hidden="true" className="text-cs-primary shrink-0" /> {institution.email}
                    </a>
                  )}
                  {institution.phone && (
                    <span className="inline-flex items-center gap-2.5">
                      <LuPhone aria-hidden="true" className="text-cs-primary shrink-0" /> {institution.phone}
                    </span>
                  )}
                  {institution.website && (
                    <a className="inline-flex items-center gap-2.5 no-underline text-gray-700 hover:text-cs-primary" href={institution.website} target="_blank" rel="noreferrer">
                      <LuGlobe aria-hidden="true" className="text-cs-primary shrink-0" /> {displayUrl(institution.website)}
                    </a>
                  )}
                </div>
              )
            }
          />
        </PageSection>
      )}

      <PageSection tone="white" title={t('institution_projects_title')}>
        {projectSlugsError || allProjectsError ? (
          <SectionLoadError />
        ) : projectSlugsPending || allProjectsPending ? (
          <p className="text-gray-600 m-0">{t('loading_projects')}</p>
        ) : linkedProjects.length === 0 ? (
          <p className="text-gray-600 m-0">{t('institution_projects_empty')}</p>
        ) : (
          <>
            <div ref={gridRef} className="cs-card-grid">
              {pageItems.map((project: MadocProjectDto) => (
                <ProjectCard key={project.id} projectSummaryData={project} />
              ))}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} label={t('projects_pagination_label')} />
          </>
        )}
      </PageSection>

      <HonourBoardBand board={honourBoard} />
    </CsPage>
  );
}
