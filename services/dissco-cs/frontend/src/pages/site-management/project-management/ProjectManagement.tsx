import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { projectQueries } from '../../../api/queries/projects';
import { manualQueries } from '../../../api/queries/manuals';
import { institutionQueries } from '../../../api/queries/institutions';
import { formQueries } from '../../../api/queries/forms';
import { CsPage } from '../../../components/layout/CsPage';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBody } from '../../../components/layout/PageBody';
import { ManageLoadError } from '../ManageLoadError';
import { failedToLoad } from '../../../api/query-state';
import { Tabs } from '../../../components/ui/Tabs';
import { ProjectsSubview } from './ProjectsSubview';
import { StuckTasksSubview } from './StuckTasksSubview';
import { TaskDebugSubview } from './TaskDebugSubview';
import { BulkCreateProjectsSubview } from './BulkCreateProjectsSubview';

export function ProjectManagement() {
  const { t } = useTranslation('dissco-cs');
  const [tab, setTab] = useState<'projects' | 'stuck-tasks' | 'task-debug' | 'bulk-create'>('projects');

  // All projects, every status, every page -- unlike the public Homepage/Projects pages (which
  // deliberately only show published/active ones), project management needs to see drafts and
  // paused projects too, e.g. a template project that is never published itself.
  const allProjectsQuery = useQuery(projectQueries.listAll());
  const projects = allProjectsQuery.data ?? [];

  const manualsQuery = useQuery(manualQueries.list());
  const { data: manuals = [] } = manualsQuery;

  const institutionsQuery = useQuery(institutionQueries.admin());
  const { data: institutions = [] } = institutionsQuery;

  const formsQuery = useQuery(formQueries.list());
  const { data: forms = [] } = formsQuery;

  if ([allProjectsQuery, manualsQuery, institutionsQuery, formsQuery].some(failedToLoad)) {
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
            { key: 'stuck-tasks', label: t('sm_tile_stuck_tasks_title') },
            { key: 'task-debug', label: 'Task status (debug)' },
            { key: 'bulk-create', label: t('sm_manuals_tab_bulk') },
          ]}
        />

        {tab === 'projects' && (
          <ProjectsSubview projects={projects} manuals={manuals} institutions={institutions} forms={forms} />
        )}
        {tab === 'stuck-tasks' && <StuckTasksSubview />}
        {tab === 'task-debug' && <TaskDebugSubview projects={projects} />}
        {tab === 'bulk-create' && <BulkCreateProjectsSubview projects={projects} />}
      </PageBody>
    </CsPage>
  );
}
