import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MadocProjectDto } from '@dissco-cs/shared-types';
import { projectQueries } from '../../api/queries/projects';
import { PageSection } from '../../components/layout/PageSection';
import { SectionLoadError } from '../../components/layout/SectionLoadError';
import { ProjectCard } from '../../components/projects/ProjectCard';
import { useGridColumnCount } from '../../hooks/use-grid-column-count';

// Running projects on Home: exactly one full row, as many cards as fit next to each other on this
// screen, so there is never a half-empty second row.
export function HomeProjectsSection() {
  const { t } = useTranslation('dissco-cs');
  const { data, status } = useQuery(projectQueries.list({ page: 1, published: true }));
  const [gridRef, columns] = useGridColumnCount<HTMLDivElement>();

  const running = (data?.projects ?? []).filter((project: MadocProjectDto) => project.status === 1).slice(0, columns);

  return (
    <PageSection
      title={t('projects_section_title')}
      intro={t('home_projects_intro')}
      action={{ href: '/explore', label: t('projects_all') }}
    >
      {status === 'pending' && <p className="text-gray-600 m-0">{t('loading_projects')}</p>}
      {status === 'error' && <SectionLoadError />}
      {status === 'success' && running.length === 0 && <p className="text-gray-600 m-0">{t('no_projects')}</p>}
      <div ref={gridRef} className="cs-card-grid cs-card-grid--dense">
        {running.map((project: MadocProjectDto) => (
          <ProjectCard key={project.id} projectSummaryData={project} />
        ))}
      </div>
    </PageSection>
  );
}
