import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectList } from '../../hooks/use-project-list';
import { CsPage } from '../../components/CsPage';
import { ProjectCard } from '../../components/projectcard/ProjectCard';
import { AnnouncementBanner } from '../../components/announcements/AnnouncementBanner';
import { WelcomeModal } from '../../components/WelcomeModal';
import { ArrowDownIcon } from '../../icons/ArrowDownIcon';
import { StatBanner } from '../../components/StatBanner';
import { HonourBoardSpotlight } from '../../components/honour-board/HonourBoardSpotlight';
import { disscoCSConfig } from '../../dissco-cs-config';
import { useSiteStats } from '../../hooks/use-site-stats';

export const Homepage: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const { data: projectsResponse, status } = useProjectList();
  const { data: siteStats } = useSiteStats();
  const { t, i18n } = useTranslation('dissco-cs');
  const formatNumber = (n: number) => n.toLocaleString(i18n.language);

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
      <WelcomeModal />
      <div className="cs-main-wrapper">

        <header className="bg-[var(--cs-primary)] text-left text-white relative mt-0">
          <div
            className="cs-container cs-container--wide relative bg-[length:auto_160%] bg-no-repeat py-8"
            style={{
              backgroundImage: `var(--hero-bg, url(${disscoCSConfig.heroBgUrl}))`,
              backgroundPosition: 'right 0px top -28px',
            } as React.CSSProperties}
          >
            <h1 className="text-[32px] font-light leading-tight mb-3 text-white mt-0" dangerouslySetInnerHTML={{ __html: t('hero_title') }} />
            <p className="text-[20px] text-white/90 max-w-[650px] mb-5 leading-[1.5]" dangerouslySetInnerHTML={{ __html: t('hero_lead') }} />
            <div className="flex gap-4 items-center">
              <button className="inline-flex items-center gap-1 bg-[var(--cs-secondary)] text-white border-none px-6 py-2.5 rounded-full font-medium cursor-pointer text-base no-underline">
                {t('btn_active')} <ArrowDownIcon aria-hidden="true" />
              </button>
              <button className="bg-transparent text-white border border-white/60 px-6 py-2.5 rounded-full font-medium cursor-pointer text-base no-underline">
                {t('btn_read_more')}
              </button>
            </div>
            <span className="absolute bottom-0 right-0 opacity-50 text-xs italic text-white">
              {t('hero_bg_credit', disscoCSConfig.heroBgCredit)}
            </span>
          </div>
        </header>

        <div className="cs-container cs-container--wide">
          <AnnouncementBanner target="homepage" />
        </div>

        <main className="pt-10 pb-10">
          <div className="cs-container cs-container--wide grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-x-8">
            <div className="lg:col-start-1 lg:row-start-1 lg:self-start flex flex-col">
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
                {isClient && !isLoadingList && projects.length === 0 && (
                  <p className="text-center py-5">{t('no_projects')}</p>
                )}
                <div className="cs-projects-grid cs-projects-grid--compact">
                  {latestFiveProjects.map((project: any) => (
                    <ProjectCard key={project.id} projectSummaryData={project} />
                  ))}
                </div>
              </div>
            </div>
            <HonourBoardSpotlight className="mt-8 lg:mt-6 lg:col-start-2 lg:row-start-1 lg:self-start" />
          </div>
        </main>

        <footer className="text-center py-8 text-gray-500 text-sm border-t border-gray-200 bg-white mt-16">
          <div className="cs-container cs-container--wide">
            <p>{t('footer_text')}</p>
          </div>
        </footer>

      </div>
    </CsPage>
  );
};
