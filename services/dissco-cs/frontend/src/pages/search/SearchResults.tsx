import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CsPage } from '../../components/layout/CsPage';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageSection } from '../../components/layout/PageSection';
import { SectionLoadError } from '../../components/layout/SectionLoadError';
import { ProjectCard } from '../../components/projects/ProjectCard';
import { InstitutionCard } from '../../components/institutions/InstitutionCard';
import { useSearch } from './use-search';
import { MadocProjectDto } from '@dissco-cs/shared-types';
import { LoadingText } from '../../components/layout/LoadingText';
import { EmptyText } from '../../components/layout/EmptyText';

export function SearchResults() {
  const { t } = useTranslation('dissco-cs');
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { isActive, projects, institutions, load } = useSearch(query);

  const totalResults = projects.length + institutions.length;

  return (
    <CsPage>
      <PageHeader
        variant="compact"
        title={t('search_results_title', { query })}
        lead={isActive && load === 'ready' ? t('search_results_count', { count: totalResults }) : undefined}
      />
      {isActive && load === 'failed' && (
        <PageSection>
          <SectionLoadError />
        </PageSection>
      )}

      {isActive && load === 'loading' && (
        <PageSection>
          <LoadingText />
        </PageSection>
      )}

      {isActive && load === 'ready' && totalResults === 0 && (
        <PageSection>
          <EmptyText>{t('search_empty', { query })}</EmptyText>
        </PageSection>
      )}

      {load === 'ready' && projects.length > 0 && (
        <PageSection title={<>{t('search_projects_heading')} <span className="text-sm font-bold text-white bg-cs-secondary rounded-full px-2.5 py-0.5 align-middle">{projects.length}</span></>}>
          <div className="cs-card-grid">
            {projects.map((project: MadocProjectDto) => (
              <ProjectCard key={project.id} projectSummaryData={project} />
            ))}
          </div>
        </PageSection>
      )}

      {load === 'ready' && institutions.length > 0 && (
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
