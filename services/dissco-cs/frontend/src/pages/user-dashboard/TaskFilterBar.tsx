import { useTranslation } from 'react-i18next';
import { LuSearch } from 'react-icons/lu';
import { Select } from '../../components/ui/Select';
import { filterFieldClass } from '../../components/ui/input-styles';
import { TASK_SORTS, TaskSort } from './dashboard-tasks';

const labelClass = 'flex flex-col gap-1 text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-gray-500';
const SORT_LABELS: Record<TaskSort, string> = {
  date: 'dashboard_tasks_sort_date',
  name: 'dashboard_tasks_sort_name',
  project: 'my_tasks_col_project',
};

// Search, project and order above the user's task list.
export function TaskFilterBar({ query, onQuery, projectId, onProject, projectOptions, sort, onSort }: {
  query: string;
  onQuery: (value: string) => void;
  projectId: string;
  onProject: (value: string) => void;
  projectOptions: { id: string; name: string }[];
  sort: TaskSort;
  onSort: (value: TaskSort) => void;
}) {
  const { t } = useTranslation('dissco-cs');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)] gap-2.5">
      <label className={labelClass}>
        {t('dashboard_tasks_search')}
        <span className="relative">
          <LuSearch className="absolute left-[11px] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
          <input
            className={`${filterFieldClass} pl-9`}
            type="search"
            placeholder={t('dashboard_tasks_search_placeholder')}
            value={query}
            onChange={e => onQuery(e.target.value)}
          />
        </span>
      </label>
      <label className={labelClass}>
        {t('my_tasks_col_project')}
        <Select className={filterFieldClass} value={projectId} onChange={e => onProject(e.target.value)}>
          <option value="">{t('projects_all')}</option>
          {projectOptions.map(option => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
      </label>
      <label className={labelClass}>
        {t('dashboard_tasks_sort')}
        <Select className={filterFieldClass} value={sort} onChange={e => onSort(e.target.value as TaskSort)}>
          {TASK_SORTS.map(option => (
            <option key={option} value={option}>
              {t(SORT_LABELS[option])}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
