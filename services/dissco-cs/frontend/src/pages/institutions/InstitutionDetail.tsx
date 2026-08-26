import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { CsPage } from '../../components/CsPage';
import { HrefLink } from '../../utility/href-link';
import { ArrowLeftIcon } from '../../icons/ArrowLeftIcon';
import { MailIcon } from '../../icons/MailIcon';
import { PhoneIcon } from '../../icons/PhoneIcon';
import { GlobeIcon } from '../../icons/GlobeIcon';
import { institutionsApi, Institution } from '../../api/cs-api';
import { StatBanner } from '../../components/StatBanner';
import { PeriodCard } from '../../components/honour-board/PeriodCard';
import { getAllSiteProjects } from '../../api/madoc-client/projects';
import { useInstitutionStats } from '../../hooks/use-institution-stats';
import { useInstitutionHonourBoard } from '../../hooks/use-institution-honour-board';
import { ProjectCard } from '../../components/projectcard/ProjectCard';
import { MedalIcon } from '../../icons/MedalIcon';
import { ClockIcon } from '../../icons/ClockIcon';
import { CalendarIcon } from '../../icons/CalendarIcon';

export const InstitutionDetail: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { slug } = useParams<{ slug: string }>();
  const { data: institution, isLoading } = useQuery(
    ['institution', slug],
    () => institutionsApi.getActive(slug!),
    { enabled: !!slug }
  );

  const { data: projectSlugsResponse } = useQuery(
    ['institution-projects', slug],
    () => institutionsApi.getActiveProjectSlugs(slug!),
    { enabled: !!slug }
  );
  const projectSlugs = projectSlugsResponse?.projectSlugs ?? [];

  // All pages, published-only -- same reasoning as Homepage/Projects.tsx: a site-admin viewer
  // otherwise gets every status unfiltered from page 1 only, which can miss this institution's
  // linked projects entirely if enough other/older projects exist.
  const { data: allProjects } = useQuery(
    ['all-site-projects', { published: true }],
    () => getAllSiteProjects({ published: true }),
    { staleTime: 5 * 60 * 1000 }
  );
  const linkedProjects = (allProjects ?? []).filter((p: any) => projectSlugs.includes(p.slug));

  const { data: overview } = useInstitutionStats(slug);
  const { data: honourBoard } = useInstitutionHonourBoard(slug);
  const tasksCompletedPct = overview && overview.tasksTotal > 0 ? Math.round((overview.tasksCompleted / overview.tasksTotal) * 100) : 0;
  const legendLeader = honourBoard?.legend.top[0];

  const [descExpanded, setDescExpanded] = React.useState(false);

  const text = (field: Institution['name']) => field[i18n.language as keyof Institution['name']] || field.nl || '';
  const formatNumber = (n: number) => n.toLocaleString(i18n.language);
  const displayUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const hasContact = institution && (institution.email || institution.phone || institution.website);
  const hasSidebar = institution && (institution.logo || hasContact);
  const description = institution ? text(institution.description) : '';
  const isLongDescription = description.length > 400;

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">
          <HrefLink href="/institutions" className="inline-flex items-center gap-1 text-[var(--cs-primary)] no-underline font-medium hover:underline">
            <ArrowLeftIcon aria-hidden="true" /> {t('institution_back_to_list')}
          </HrefLink>

          {isLoading && <p className="text-center py-10">{t('loading_projects')}</p>}

          {!isLoading && !institution && (
            <p className="text-center py-10 text-gray-600">{t('institution_not_found')}</p>
          )}

          {institution && (
            <>
              {/* Unified grid: hero row, stat banner + leaderboard (level with each other), then projects */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-x-14 mt-6">
                {/* Hero: title/description */}
                <div className="min-w-0 max-w-[720px] lg:col-start-1 lg:row-start-1">
                  <h1 className="text-4xl text-[var(--cs-primary)] mt-0 mb-5">{text(institution.name)}</h1>
                  {description && (
                    <>
                      <p className={`text-base leading-relaxed text-gray-700 m-0 whitespace-pre-line ${!descExpanded && isLongDescription ? 'line-clamp-4' : ''}`}>
                        {description}
                      </p>
                      {isLongDescription && (
                        <button
                          type="button"
                          onClick={() => setDescExpanded(e => !e)}
                          className="mt-2 text-sm font-semibold text-[var(--cs-primary)] bg-transparent border-none p-0 cursor-pointer hover:underline"
                        >
                          {descExpanded ? t('institution_read_less') : t('institution_read_more')}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Hero: contact sidebar */}
                {hasSidebar && (
                  <div className="w-full flex-shrink-0 flex flex-col gap-4 pt-6 lg:pt-0 lg:pl-10 border-t lg:border-t-0 lg:border-l border-gray-100 lg:col-start-2 lg:row-start-1">
                    {institution.logo && (
                      <div
                        className="h-20 w-full bg-contain bg-left bg-no-repeat"
                        style={{ backgroundImage: `url(${institution.logo})` }}
                      />
                    )}
                    {institution.email && (
                      <a className="flex items-center gap-2.5 text-sm text-gray-700 no-underline hover:text-[var(--cs-primary)] whitespace-nowrap" href={`mailto:${institution.email}`}>
                        <MailIcon aria-hidden="true" className="text-[var(--cs-primary)] flex-shrink-0" /> {institution.email}
                      </a>
                    )}
                    {institution.phone && (
                      <span className="flex items-center gap-2.5 text-sm text-gray-700 whitespace-nowrap">
                        <PhoneIcon aria-hidden="true" className="text-[var(--cs-primary)] flex-shrink-0" /> {institution.phone}
                      </span>
                    )}
                    {institution.website && (
                      <a className="flex items-center gap-2.5 text-sm text-gray-700 no-underline hover:text-[var(--cs-primary)] whitespace-nowrap" href={institution.website} target="_blank" rel="noreferrer">
                        <GlobeIcon aria-hidden="true" className="text-[var(--cs-primary)] flex-shrink-0" /> {displayUrl(institution.website)}
                      </a>
                    )}
                  </div>
                )}

                {/* Stats banner + projects — one grid cell so the projects section sits right under the banner, independent of the leaderboard's height */}
                <div className="mt-14 lg:col-start-1 lg:row-start-2 flex flex-col">
                  <StatBanner
                    eyebrow={t('institution_stats_caption', { name: text(institution.name) })}
                    stats={[
                      {
                        value: `${tasksCompletedPct}%`,
                        label: t('pdp_transcribed'),
                        note: overview ? `${formatNumber(overview.tasksTotal)} ${t('institution_progress_tasks')}` : undefined,
                      },
                      { value: overview ? overview.projectsActive : '—', label: t('institution_projects_active') },
                      { value: overview ? overview.projectsCompleted : '—', label: t('institution_projects_completed') },
                      { value: overview ? formatNumber(overview.volunteers) : '—', label: t('institution_stats_volunteers') },
                    ]}
                    trailing={
                      legendLeader && (
                        <div className="flex items-center gap-2 text-sm">
                          <MedalIcon className="w-[18px] h-[18px] opacity-90" aria-hidden="true" />
                          <span>{t('honour_board_legend_headline', { name: legendLeader.name, value: formatNumber(legendLeader.count) })}</span>
                        </div>
                      )
                    }
                    trailingDivider
                  />

                  <div className="mt-8">
                    {linkedProjects.length === 0 ? (
                      <p className="text-sm text-gray-500">{t('institution_projects_empty')}</p>
                    ) : (
                      <div className="cs-projects-grid cs-projects-grid--compact">
                        {linkedProjects.map((project: any) => (
                          <ProjectCard key={project.id} projectSummaryData={project} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Leaderboard — starts level with the banner, runs down alongside it */}
                <div className="mt-14 lg:col-start-2 lg:row-start-2 flex flex-col gap-4">
                  {honourBoard ? (
                    <>
                      <PeriodCard
                        titleKey="honour_board_period_today"
                        icon={<ClockIcon className="w-4 h-4" />}
                        period={honourBoard.today}
                        formatNumber={formatNumber}
                        dark
                      />
                      <PeriodCard
                        titleKey="honour_board_period_week"
                        icon={<CalendarIcon className="w-4 h-4" />}
                        period={honourBoard.week}
                        formatNumber={formatNumber}
                        dark
                      />
                      <PeriodCard
                        titleKey="honour_board_period_month"
                        icon={<CalendarIcon className="w-4 h-4" />}
                        period={honourBoard.month}
                        formatNumber={formatNumber}
                        dark
                      />
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">{t('card_loading')}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </CsPage>
  );
};
