import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { getAllSiteProjects } from '../../api/madoc-client/projects';
import { HrefLink } from '../../utility/href-link';
import { CsPage } from '../../components/CsPage';
import { LuArrowLeft } from 'react-icons/lu';
import { projectManualsApi, institutionsApi } from '../../api/cs-api';
import { ProjectsSubview } from './project-management/ProjectsSubview';
import { ManualsSubview } from './project-management/ManualsSubview';
import { StuckTasksSubview } from './project-management/StuckTasksSubview';
import { TaskDebugSubview } from './project-management/TaskDebugSubview';
import { BulkCreateProjectsSubview } from './project-management/BulkCreateProjectsSubview';

export const ProjectManagement: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const [tab, setTab] = useState<'projects' | 'manuals' | 'stuck-tasks' | 'task-debug' | 'bulk-create'>('projects');

  // All projects, every status, every page -- unlike the public Homepage/Projects pages (which
  // deliberately only show published/active ones), project management needs to see drafts and
  // paused projects too, e.g. to link them to an institution before they go live.
  const { data: allProjects, status: allProjectsStatus } = useQuery('admin-all-site-projects', () =>
    getAllSiteProjects()
  );
  const projects = allProjects ?? [];

  const {
    data: manualsResponse,
    refetch: refetchManuals,
    status: manualsStatus,
  } = useQuery('admin-project-manuals', () => projectManualsApi.list());
  const manuals = manualsResponse?.manuals ?? [];

  const { data: institutionsResponse } = useQuery('admin-institutions', () => institutionsApi.listAdmin());
  const institutions = institutionsResponse?.institutions ?? [];

  const {
    data: institutionLinksResponse,
    refetch: refetchInstitutionLinks,
    status: institutionLinksStatus,
  } = useQuery('admin-institution-project-links', () => institutionsApi.listProjectLinks());
  const institutionLinks = institutionLinksResponse?.links ?? {};

  // Achtergrondvergelijking: Madoc weet niets van dissco-cs, dus als een project in Madoc
  // verwijderd wordt, blijven de gekoppelde instituut/handleiding-links hier achter. Bij het
  // laden van deze pagina wordt daarom de volledige (ongefilterde, alle pagina's/statussen)
  // Madoc-projectenlijst opgehaald en gebruikt om links naar niet meer bestaande projecten
  // stilzwijgend te verwijderen -- non-blocking en best-effort, breekt de pagina niet bij falen.
  // Wacht bewust tot beide queries hun EERSTE fetch al hebben afgerond ('success') voordat de
  // prune-refetch gestart wordt: refetch() op een query die nog in-flight is voor dezelfde key
  // levert in react-query v2 gewoon de (verouderde, van-vóór-de-prune) al lopende request terug
  // i.p.v. een nieuwe -- waardoor de UI pas bij een volledige page refresh klopte.
  const pruneRanRef = useRef(false);
  useEffect(() => {
    if (pruneRanRef.current) return;
    if (allProjectsStatus !== 'success' || manualsStatus !== 'success' || institutionLinksStatus !== 'success') return;
    pruneRanRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const liveSlugs = projects.map(p => p.slug).filter((slug: unknown): slug is string => !!slug);
        if (cancelled || liveSlugs.length === 0) return;

        const [institutionResult, manualResult] = await Promise.all([
          institutionsApi.pruneProjectLinks(liveSlugs),
          projectManualsApi.pruneProjectLinks(liveSlugs),
        ]);

        if (cancelled) return;
        if (institutionResult.removed > 0) refetchInstitutionLinks();
        if (manualResult.removed > 0) refetchManuals();
      } catch (err) {
        console.error('[ProjectManagement] opruimen van verweesde projectlinks mislukt', err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProjectsStatus, manualsStatus, institutionLinksStatus]);

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container cs-container--wide">
          <HrefLink href="/manage" className="inline-flex items-center gap-1 text-[var(--cs-primary)] no-underline font-medium hover:underline">
            <LuArrowLeft aria-hidden="true" /> {t('sm_back_to_hub')}
          </HrefLink>

          <h1 className="text-4xl text-[var(--cs-primary)] mt-4 mb-8">{t('sm_tile_projects_title')}</h1>

          <div className="flex gap-5 border-b border-gray-200 mb-6">
            <button
              onClick={() => setTab('projects')}
              className={`text-sm font-semibold pb-2.5 border-b-2 bg-transparent cursor-pointer ${
                tab === 'projects' ? 'text-[var(--cs-primary)] border-[var(--cs-primary)]' : 'text-gray-500 border-transparent'
              }`}
            >
              {t('sm_manuals_tab_projects')}
            </button>
            <button
              onClick={() => setTab('manuals')}
              className={`text-sm font-semibold pb-2.5 border-b-2 bg-transparent cursor-pointer ${
                tab === 'manuals' ? 'text-[var(--cs-primary)] border-[var(--cs-primary)]' : 'text-gray-500 border-transparent'
              }`}
            >
              {t('sm_manuals_tab_manuals')}
            </button>
            <button
              onClick={() => setTab('stuck-tasks')}
              className={`text-sm font-semibold pb-2.5 border-b-2 bg-transparent cursor-pointer ${
                tab === 'stuck-tasks' ? 'text-[var(--cs-primary)] border-[var(--cs-primary)]' : 'text-gray-500 border-transparent'
              }`}
            >
              {t('sm_tile_stuck_tasks_title')}
            </button>
            <button
              onClick={() => setTab('task-debug')}
              className={`text-sm font-semibold pb-2.5 border-b-2 bg-transparent cursor-pointer ${
                tab === 'task-debug' ? 'text-[var(--cs-primary)] border-[var(--cs-primary)]' : 'text-gray-500 border-transparent'
              }`}
            >
              Task status (debug)
            </button>
            <button
              onClick={() => setTab('bulk-create')}
              className={`text-sm font-semibold pb-2.5 border-b-2 bg-transparent cursor-pointer ${
                tab === 'bulk-create' ? 'text-[var(--cs-primary)] border-[var(--cs-primary)]' : 'text-gray-500 border-transparent'
              }`}
            >
              {t('sm_manuals_tab_bulk')}
            </button>
          </div>

          {tab === 'projects' && (
            <ProjectsSubview
              projects={projects}
              manuals={manuals}
              refetchManuals={refetchManuals}
              institutions={institutions}
              institutionLinks={institutionLinks}
              refetchInstitutionLinks={refetchInstitutionLinks}
            />
          )}
          {tab === 'manuals' && <ManualsSubview projects={projects} manuals={manuals} refetchManuals={refetchManuals} />}
          {tab === 'stuck-tasks' && <StuckTasksSubview />}
          {tab === 'task-debug' && <TaskDebugSubview projects={projects} />}
          {tab === 'bulk-create' && <BulkCreateProjectsSubview projects={projects} />}
        </div>
      </div>
    </CsPage>
  );
};
