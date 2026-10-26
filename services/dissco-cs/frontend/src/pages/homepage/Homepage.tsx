import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CsPage } from '../../components/layout/CsPage';
import { WelcomeModal } from './WelcomeModal';
import { HomeProjectsSection } from './HomeProjectsSection';
import { HomeStepsSection } from './HomeStepsSection';
import { HomeInstitutionsSection } from './HomeInstitutionsSection';
import { HeaderImage, PageHeader } from '../../components/layout/PageHeader';
import { PageHeaderPhoto } from '../../components/layout/PageHeaderPhoto';
import { HonourBoardBand } from '../../components/stats/HonourBoardBand';
import { useSiteHonourBoard } from '../../hooks/use-site-honour-board';
import { disscoCSConfig } from '../../dissco-cs-config';
import { useSiteStats } from '../../hooks/use-site-stats';
import { formatNumber } from '../../utility/format-number';

export function Homepage() {
  const [isClient, setIsClient] = useState(false);
  const { data: siteStats } = useSiteStats();
  const honourBoard = useSiteHonourBoard();
  const { t, i18n } = useTranslation('dissco-cs');

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="bg-cs-primary min-h-screen" />;
  }

  return (
    <CsPage>
      <WelcomeModal />
      <PageHeader
        variant="split-banner"
        continuous
        title={t('hero_title')}
        lead={t('hero_lead')}
        stats={[
          { value: siteStats ? formatNumber(siteStats.volunteers, i18n.language) : '—', label: t('institution_stats_volunteers') },
          {
            value: siteStats ? `${formatNumber(siteStats.tasksCompleted, i18n.language)} / ${formatNumber(siteStats.tasksTotal, i18n.language)}` : '—',
            label: t('honour_board_stat_tasks_label'),
          },
        ]}
        aside={
          <PageHeaderPhoto
            pageKey="home"
            fallback={<HeaderImage src={disscoCSConfig.heroBgUrl} credit={disscoCSConfig.heroBgCredit} fit="cutout" />}
          />
        }
      />

      <main>
        <HomeProjectsSection />
        <HomeStepsSection />
        <HomeInstitutionsSection />
      </main>

      <HonourBoardBand board={honourBoard} />
    </CsPage>
  );
}
