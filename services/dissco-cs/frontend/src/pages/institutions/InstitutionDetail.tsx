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
import { useProjectList } from '../../hooks/use-project-list';
import { ProjectCard } from '../../components/projectcard/ProjectCard';

// Placeholder cijfers tot statistieken effectief aan een instituut gekoppeld kunnen worden.
const mockOverview = {
  projectsActive: 3,
  projectsCompleted: 5,
  tasksTotal: 12480,
  tasksCompletedPct: 61,
};

const mockLeaderboard = [
  { rank: 1, name: 'Vrijwilliger A', tasks: 812 },
  { rank: 2, name: 'Vrijwilliger B', tasks: 645 },
  { rank: 3, name: 'Vrijwilliger C', tasks: 590 },
  { rank: 4, name: 'Vrijwilliger D', tasks: 477 },
  { rank: 5, name: 'Vrijwilliger E', tasks: 320 },
];

const mockVolunteers = 84;

const MockBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-block text-[0.65rem] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
    {label}
  </span>
);

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

  const { data: allProjectsResponse } = useProjectList();
  const linkedProjects = (allProjectsResponse?.projects ?? []).filter((p: any) => projectSlugs.includes(p.slug));

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
              {/* Hero: title/description with contact info aligned alongside */}
              <div className="flex flex-col md:flex-row gap-14 items-start mt-6 mb-14">
                <div className="min-w-0" style={{ flex: '0 1 720px' }}>
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

                {hasSidebar && (
                  <div className="w-full md:w-[280px] flex-shrink-0 flex flex-col gap-4 pt-6 md:pt-0 md:pl-10 border-t md:border-t-0 md:border-l border-gray-100">
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
              </div>

              {/* Stats hero banner — same signature as the volunteer dashboard */}
              <StatBanner
                className="mb-12"
                stats={[
                  {
                    value: `${mockOverview.tasksCompletedPct}%`,
                    label: t('pdp_transcribed'),
                    note: `${formatNumber(mockOverview.tasksTotal)} ${t('institution_progress_tasks')}`,
                  },
                  { value: mockOverview.projectsActive, label: t('institution_projects_active') },
                  { value: mockOverview.projectsCompleted, label: t('institution_projects_completed') },
                  { value: formatNumber(mockVolunteers), label: t('institution_stats_volunteers') },
                ]}
                trailing={<MockBadge label={t('institution_mock_badge')} />}
              />

              {/* Projects, with leaderboard alongside */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-14">
                <div>
                  {linkedProjects.length === 0 ? (
                    <p className="text-sm text-gray-500">{t('institution_projects_empty')}</p>
                  ) : (
                    <div className="cs-projects-grid">
                      {linkedProjects.map((project: any) => (
                        <ProjectCard key={project.id} projectSummaryData={project} />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('institution_leaderboard_title')}</div>
                    <MockBadge label={t('institution_mock_badge')} />
                  </div>
                  <ol className="list-none m-0 p-0 flex flex-col">
                    {mockLeaderboard.map(entry => (
                      <li key={entry.rank} className="flex items-baseline gap-2.5 py-2 border-b border-gray-100 last:border-b-0 text-sm">
                        <span className="w-[1.2em] text-gray-500 tabular-nums">{entry.rank}</span>
                        <span className="flex-1 text-gray-700">{entry.name}</span>
                        <span className="text-gray-500 tabular-nums">{formatNumber(entry.tasks)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </CsPage>
  );
};
