import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CsPage } from '../../components/CsPage';
import { ProjectCard } from '../../components/projectcard/ProjectCard';
import { InstitutionCard } from '../../components/institutioncard/InstitutionCard';
import { useSearch } from '../../hooks/use-search';

export const SearchResults: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { isActive, projects, institutions, isLoading } = useSearch(query);

  const totalResults = projects.length + institutions.length;

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">

          <header className="mb-8">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-3">
              {t('search_results_title', { query })}
            </h1>
            {isActive && !isLoading && (
              <p className="text-lg text-gray-600">
                {t('search_results_count', { count: totalResults })}
              </p>
            )}
          </header>

          <hr className="mb-8" />

          {isLoading && isActive && <p className="text-center py-5">{t('loading_projects')}</p>}

          {!isLoading && isActive && totalResults === 0 && (
            <p className="text-center py-5">{t('search_no_results', { query })}</p>
          )}

          {!isLoading && projects.length > 0 && (
            <div className="mb-10">
              <h2 className="text-2xl text-gray-800 mb-4 flex items-center gap-2">
                {t('search_projects_heading')}
                <span className="text-sm font-bold text-white bg-[var(--cs-secondary)] rounded-full px-2.5 py-0.5">
                  {projects.length}
                </span>
              </h2>
              <div className="cs-projects-grid">
                {projects.map((project: any) => (
                  <ProjectCard key={project.id} projectSummaryData={project} />
                ))}
              </div>
            </div>
          )}

          {!isLoading && institutions.length > 0 && (
            <div>
              <h2 className="text-2xl text-gray-800 mb-4 flex items-center gap-2">
                {t('search_institutions_heading')}
                <span className="text-sm font-bold text-white bg-[var(--cs-secondary)] rounded-full px-2.5 py-0.5">
                  {institutions.length}
                </span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {institutions.map(institution => (
                  <InstitutionCard key={institution.id} institution={institution} />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </CsPage>
  );
};
