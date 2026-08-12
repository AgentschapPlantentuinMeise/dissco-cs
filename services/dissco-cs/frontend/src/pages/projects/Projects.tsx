import React from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectList } from '../../hooks/use-project-list';
import { CsPage } from '../../components/CsPage';
import { ProjectCard } from '../../components/projectcard/ProjectCard';
import { AnnouncementBanner } from '../../components/announcements/AnnouncementBanner';

export const Projects: React.FC = () => {
  const { data: projectsResponse, status } = useProjectList();
  const { t } = useTranslation('dissco-cs');
  const allProjects = projectsResponse?.projects || [];
  const projects = allProjects.filter((p: any) => p.status === 1);
  const isLoadingList = status === 'loading';

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">

          <header className="mb-8">
            <h1 className="text-4xl text-[var(--cs-primary)] mb-3">{t('projects_title')}</h1>
            <p className="text-lg text-gray-600">{t('projects_intro')}</p>
          </header>

          <AnnouncementBanner target="projects" />

          {isLoadingList && <p className="text-center py-5">{t('loading_projects')}</p>}
          {!isLoadingList && projects.length === 0 && (
            <p className="text-center py-5">{t('no_projects')}</p>
          )}

          <div className="cs-projects-grid">
            {projects.map((project: any) => (
              <ProjectCard key={project.id} projectSummaryData={project} />
            ))}
          </div>

        </div>
      </div>
    </CsPage>
  );
};
