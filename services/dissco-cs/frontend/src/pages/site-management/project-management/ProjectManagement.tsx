import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectKeys, projectQueries } from '../../../api/queries/projects';
import { manualKeys, manualQueries } from '../../../api/queries/manuals';
import { institutionQueries } from '../../../api/queries/institutions';
import { CsPage } from '../../../components/layout/CsPage';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBody } from '../../../components/layout/PageBody';
import { ManageLoadError } from '../ManageLoadError';
import { failedToLoad } from '../../../api/query-state';
import { projectsApi } from '../../../api/cs-client/projects';
import { Tabs } from '../../../components/ui/Tabs';
import { ProjectsSubview } from './ProjectsSubview';
import { ManualsSubview } from './ManualsSubview';
import { StuckTasksSubview } from './StuckTasksSubview';
import { TaskDebugSubview } from './TaskDebugSubview';
import { BulkCreateProjectsSubview } from './BulkCreateProjectsSubview';
import { reportClientError } from '../../../api/cs-client/client-errors';

export function ProjectManagement() {
  const { t } = useTranslation('dissco-cs');
  const [tab, setTab] = useState<'projects' | 'manuals' | 'stuck-tasks' | 'task-debug' | 'bulk-create'>('projects');

  // All projects, every status, every page -- unlike the public Homepage/Projects pages (which
  // deliberately only show published/active ones), project management needs to see drafts and
  // paused projects too, e.g. to link them to an institution before they go live.
  const allProjectsQuery = useQuery(projectQueries.listAll());
  const { data: allProjects, status: allProjectsStatus } = allProjectsQuery;
  const projects = allProjects ?? [];

  const queryClient = useQueryClient();

  const manualsQuery = useQuery(manualQueries.list());
  const { data: manuals = [], status: manualsStatus } = manualsQuery;

  const institutionsQuery = useQuery(institutionQueries.admin());
  const { data: institutions = [] } = institutionsQuery;

  const institutionLinksQuery = useQuery(projectQueries.institutionLinks());
  const { data: institutionLinks = {}, status: institutionLinksStatus } = institutionLinksQuery;

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

  if ([allProjectsQuery, manualsQuery, institutionsQuery, institutionLinksQuery].some(failedToLoad)) {
    return <ManageLoadError />;
  }

  return (
    <CsPage>
      <PageBody>
        <PageHeader variant="plain" back={{ href: '/manage', label: t('sm_back_to_hub') }} title={t('sm_tile_projects_title')} />

        <Tabs
          selected={tab}
          onSelect={setTab}
          tabs={[
            { key: 'projects', label: t('sm_manuals_tab_projects') },
            { key: 'manuals', label: t('sm_manuals_tab_manuals') },
            { key: 'stuck-tasks', label: t('sm_tile_stuck_tasks_title') },
            { key: 'task-debug', label: 'Task status (debug)' },
            { key: 'bulk-create', label: t('sm_manuals_tab_bulk') },
          ]}
        />

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
      </PageBody>
    </CsPage>
  );
}
