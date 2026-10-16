import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectKeys, projectQueries } from '../../../api/queries/projects';
import { manualKeys, manualQueries } from '../../../api/queries/manuals';
import { institutionQueries } from '../../../api/queries/institutions';
import { HrefLink } from '../../../utility/href-link';
import { CsPage } from '../../../components/layout/CsPage';
import { LuArrowLeft } from 'react-icons/lu';
import { projectsApi } from '../../../api/cs-client/projects';
import { ProjectsSubview } from './ProjectsSubview';
import { ManualsSubview } from './ManualsSubview';
import { StuckTasksSubview } from './StuckTasksSubview';
import { TaskDebugSubview } from './TaskDebugSubview';
import { BulkCreateProjectsSubview } from './BulkCreateProjectsSubview';
import { reportClientError } from '../../../api/cs-client/client-errors';

export const ProjectManagement: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  const [tab, setTab] = useState<'projects' | 'manuals' | 'stuck-tasks' | 'task-debug' | 'bulk-create'>('projects');

  // All projects, every status, every page -- unlike the public Homepage/Projects pages (which
  // deliberately only show published/active ones), project management needs to see drafts and
  // paused projects too, e.g. to link them to an institution before they go live.
  const { data: allProjects, status: allProjectsStatus } = useQuery(projectQueries.listAll());
  const projects = allProjects ?? [];

  const queryClient = useQueryClient();

  const { data: manuals = [], status: manualsStatus } = useQuery(manualQueries.list());

  const { data: institutions = [] } = useQuery(institutionQueries.admin());

  const { data: institutionLinks = {}, status: institutionLinksStatus } = useQuery(projectQueries.institutionLinks());

  // Madoc knows nothing about dissco-cs: when a project is deleted there, its institution/manual
  // links stay behind here. So once the full project list (every page and status) and both link
  // lists are loaded, links to projects that no longer exist are removed -- best-effort and
  // non-blocking, a failure never breaks the page.
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

        const [institutionLinksRemoved, manualLinksRemoved] = await Promise.all([
          projectsApi.pruneInstitutionLinks(liveSlugs),
          projectsApi.pruneManualLinks(liveSlugs),
        ]);

        if (cancelled) return;
        if (institutionLinksRemoved > 0) queryClient.invalidateQueries({ queryKey: projectKeys.institutionLinks() });
        if (manualLinksRemoved > 0) queryClient.invalidateQueries({ queryKey: manualKeys.all });
      } catch (err) {
        reportClientError(err, 'action');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once all three lists are loaded; the data itself is read inside
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
              institutions={institutions}
              institutionLinks={institutionLinks}
            />
          )}
          {tab === 'manuals' && <ManualsSubview projects={projects} manuals={manuals} />}
          {tab === 'stuck-tasks' && <StuckTasksSubview />}
          {tab === 'task-debug' && <TaskDebugSubview projects={projects} />}
          {tab === 'bulk-create' && <BulkCreateProjectsSubview projects={projects} />}
        </div>
      </div>
    </CsPage>
  );
};
