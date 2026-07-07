import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectList } from '../../hooks/use-project-list';
import { CsPage } from '../../components/CsPage';
import { ProjectCard } from '../../components/projectcard/ProjectCard';
import { AnnouncementBanner } from '../../components/announcements/AnnouncementBanner';
import { ArrowDownIcon } from '../../icons/ArrowDownIcon';
import { disscoCSConfig } from '../../dissco-cs-config';

export const Homepage: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const { data: projectsResponse, status } = useProjectList();
  const { t } = useTranslation('dissco-cs');

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div style={{ backgroundColor: 'var(--cs-primary, #1a5b66)', minHeight: '100vh' }} />;
  }

  const projects = projectsResponse?.projects || [];
  const isLoadingList = status === 'loading';

  const latestFiveProjects = projects.filter((p: any) => p.status === 1).slice(-5).reverse();

  return (
    <CsPage>
      <div className="cs-main-wrapper">

        <header
          className="bg-[var(--cs-primary)] bg-[length:auto_100%] bg-[right_center] bg-no-repeat py-20 text-left text-white relative mt-0"
          style={{ backgroundImage: `var(--hero-bg, url(${disscoCSConfig.heroBgUrl}))` } as React.CSSProperties}
        >
          <div className="cs-container">
            <h1 className="text-[38px] font-light leading-tight mb-5 text-white mt-0" dangerouslySetInnerHTML={{ __html: t('hero_title') }} />
            <p className="text-[20px] text-white/90 max-w-[650px] mb-8 leading-[1.5]" dangerouslySetInnerHTML={{ __html: t('hero_lead') }} />
            <div className="flex gap-4 items-center">
              <button className="inline-flex items-center gap-1 bg-[var(--cs-secondary)] text-white border-none px-6 py-2.5 rounded-full font-medium cursor-pointer text-base no-underline">
                {t('btn_active')} <ArrowDownIcon aria-hidden="true" />
              </button>
              <button className="bg-transparent text-white border border-white/60 px-6 py-2.5 rounded-full font-medium cursor-pointer text-base no-underline">
                {t('btn_read_more')}
              </button>
            </div>
          </div>
          <span className="absolute bottom-4 right-4 opacity-50 text-xs italic text-white">
            {t('hero_bg_credit', disscoCSConfig.heroBgCredit)}
          </span>
        </header>

        <div className="cs-container">
          <AnnouncementBanner target="homepage" />
        </div>

        <main className="py-10">
           <div className="cs-container">
            {isLoadingList && <p className="text-center py-5">{t('loading_projects')}</p>}
            {isClient && !isLoadingList && projects.length === 0 && (
              <p className="text-center py-5">{t('no_projects')}</p>
            )}
            <div className="cs-projects-grid">
              {latestFiveProjects.map((project: any) => (
                <ProjectCard key={project.id} projectSummaryData={project} />
              ))}
            </div>
          </div>
        </main>

        <footer className="text-center py-8 text-gray-500 text-sm border-t border-gray-200 bg-white mt-16">
          <div className="cs-container">
            <p>{t('footer_text')}</p>
          </div>
        </footer>

      </div>
    </CsPage>
  );
};
