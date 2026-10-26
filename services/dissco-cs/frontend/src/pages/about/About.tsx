import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MadocProjectDto } from '@dissco-cs/shared-types';
import { projectQueries } from '../../api/queries/projects';
import { institutionQueries } from '../../api/queries/institutions';
import { CsPage } from '../../components/layout/CsPage';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageHeaderPhoto } from '../../components/layout/PageHeaderPhoto';
import { PageSection } from '../../components/layout/PageSection';
import { ManagedTextSection } from '../../components/layout/ManagedTextSection';
import { StatItems } from '../../components/ui/StatBanner';
import { useSiteStats } from '../../hooks/use-site-stats';
import { useNavItems } from '../../hooks/use-nav-items';
import { useSiteName } from '../../hooks/use-site-name';
import { formatNumber } from '../../utility/format-number';

export function About() {
  const { t, i18n } = useTranslation('dissco-cs');
  const { data: siteStats } = useSiteStats();
  const { getIntro } = useNavItems();
  const platformName = useSiteName();
  // The same queries as the Projects and Institutions pages, so these usually come from the cache.
  const { data: projects } = useQuery({ ...projectQueries.listAll({ published: true }), staleTime: 5 * 60 * 1000 });
  const { data: institutions } = useQuery(institutionQueries.active());

  const format = (n: number | undefined) => (n === undefined ? '—' : formatNumber(n, i18n.language));
  const runningProjects = projects?.filter((project: MadocProjectDto) => project.status === 1).length;

  return (
    <CsPage>
      <PageHeader
        variant="split-banner"
        title={t('nav_about', { platformName })}
        lead={getIntro('about', i18n.language) || undefined}
        aside={<PageHeaderPhoto pageKey="about" />}
      />
      <ManagedTextSection pageKey="about" />

      <PageSection title={t('about_numbers_title')}>
        <div className="flex flex-wrap items-stretch gap-7 max-[600px]:gap-5">
          <StatItems
            tone="onLight"
            stats={[
              { value: format(siteStats?.volunteers), label: t('institution_stats_volunteers') },
              { value: format(siteStats?.tasksCompleted), label: t('honour_board_stat_tasks_label') },
              { value: format(runningProjects), label: t('projects_stat_running') },
              { value: format(institutions?.length), label: t('institutions_stat_count') },
            ]}
          />
        </div>
      </PageSection>

      <PageSection
        tone="tint"
        title={t('about_start_title')}
        intro={t('about_start_intro')}
        action={{ href: '/explore', label: t('about_start_action') }}
      />
    </CsPage>
  );
}
