import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CsPage } from '../../components/layout/CsPage';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageSection } from '../../components/layout/PageSection';
import { ProjectCard } from '../../components/projects/ProjectCard';
import { InstitutionCard } from '../../components/institutions/InstitutionCard';
import { useSearch } from './use-search';
import { MadocProjectDto } from '@dissco-cs/shared-types';

export function SearchResults() {
  const { t } = useTranslation('dissco-cs');
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { isActive, projects, institutions, isLoading } = useSearch(query);

  const totalResults = projects.length + institutions.length;

  return (
    <CsPage>
      <PageHeader
        variant="compact"
        title={t('search_results_title', { query })}
        lead={isActive && !isLoading ? t('search_results_count', { count: totalResults }) : undefined}
      />
      {isActive && (isLoading || totalResults === 0) && (
        <PageSection>
          <p className="text-gray-600 m-0">{isLoading ? t('loading_projects') : t('search_no_results', { query })}</p>
        </PageSection>
      )}

      {!isLoading && projects.length > 0 && (
        <PageSection title={<>{t('search_projects_heading')} <span className="text-sm font-bold text-white bg-cs-secondary rounded-full px-2.5 py-0.5 align-middle">{projects.length}</span></>}>
          <div className="cs-card-grid">
            {projects.map((project: MadocProjectDto) => (
              <ProjectCard key={project.id} projectSummaryData={project} />
            ))}
          </div>
        </PageSection>
      )}

      {!isLoading && institutions.length > 0 && (
        <PageSection tone="white" title={<>{t('search_institutions_heading')} <span className="text-sm font-bold text-white bg-cs-secondary rounded-full px-2.5 py-0.5 align-middle">{institutions.length}</span></>}>
          <div className="cs-card-grid">
            {institutions.map(institution => (
              <InstitutionCard key={institution.id} institution={institution} />
            ))}
          </div>
        </PageSection>
      )}
    </CsPage>
  );
}
