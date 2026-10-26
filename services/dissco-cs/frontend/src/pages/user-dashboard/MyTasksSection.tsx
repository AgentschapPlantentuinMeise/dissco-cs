import { useTranslation } from 'react-i18next';
import { MadocCrowdsourcingTaskDto } from '@dissco-cs/shared-types';
import { PageSection } from '../../components/layout/PageSection';
import { Pagination } from '../../components/ui/Pagination';
import { Tabs } from '../../components/ui/Tabs';
import { TaskTable } from './TaskTable';
import { TaskFilterBar } from './TaskFilterBar';
import { TASKS_PER_PAGE, TaskTab } from './dashboard-tasks';
import { UserDashboardState } from './use-user-dashboard';

const countClass = 'text-[0.75rem] font-semibold text-cs-primary bg-cs-primary/10 rounded-full px-2 tabular-nums';

// "My tasks": saved and done tasks in tabs with their counts, then search, filter and sort, one
// page of the table, and the page buttons.
export function MyTasksSection({ list, summary, userName, loading, onRelease }: {
  list: UserDashboardState['list'];
  summary: UserDashboardState['summary'];
  userName: string;
  loading: boolean;
  onRelease: (task: MadocCrowdsourcingTaskDto) => void;
}) {
  const { t } = useTranslation('dissco-cs');
  const tabLabel = (key: string, count: number) => (
    <>
      {t(key)}
      <span className={countClass}>{count}</span>
    </>
  );
  const from = (list.page - 1) * TASKS_PER_PAGE + 1;

  return (
    <PageSection title={t('dashboard_tasks_title')} intro={t('dashboard_tasks_intro')}>
      <div className="flex flex-col gap-4">
        <Tabs<TaskTab>
          selected={list.tab}
          onSelect={list.setTab}
          tabs={[
            { key: 'saved', label: tabLabel('my_tasks_tab_saved', summary.savedTasks.length) },
            { key: 'done', label: tabLabel('my_tasks_tab_done', summary.doneTasks.length) },
          ]}
        />
        <TaskFilterBar
          query={list.query}
          onQuery={list.setQuery}
          projectId={list.projectId}
          onProject={list.setProjectId}
          projectOptions={list.projectOptions}
          sort={list.sort}
          onSort={list.setSort}
        />

        {loading ? (
          <p className="text-center py-16 text-gray-500 m-0">{t('my_tasks_loading')}</p>
        ) : list.tabTotal === 0 ? (
          <p className="px-1 py-10 text-center text-gray-500 m-0">{t(list.tab === 'saved' ? 'my_tasks_empty' : 'my_tasks_empty_done')}</p>
        ) : list.total === 0 ? (
          <p className="px-1 py-10 text-center text-gray-500 m-0">{t('dashboard_tasks_no_match')}</p>
        ) : (
          <>
            <TaskTable tasks={list.tasks} userName={userName} variant={list.tab} onRelease={onRelease} />
            <p className="m-0 text-sm text-gray-500">
              {t('dashboard_tasks_range', { from, to: from + list.tasks.length - 1, total: list.total })}
            </p>
            <Pagination currentPage={list.page} totalPages={list.totalPages} onChange={list.setPage} label={t('dashboard_tasks_pagination_label')} />
          </>
        )}
      </div>
    </PageSection>
  );
}
