import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MadocCrowdsourcingTaskDto } from '@dissco-cs/shared-types';
import { feedbackQueries } from '../../api/queries/feedback';
import { forumQueries } from '../../api/queries/forum';
import { projectKeys, projectQueries } from '../../api/queries/projects';
import { institutionQueries } from '../../api/queries/institutions';
import { taskKeys, taskQueries } from '../../api/queries/tasks';
import { tasksApi } from '../../api/cs-client/tasks';
import { useCurrentUser } from '../../hooks/use-current-user';
import { useSiteStats } from '../../hooks/use-site-stats';
import { pageCount, pageSlice, parsePageParam } from '../../utility/paging';
import {
  filterTasks,
  firstContribution,
  monthlyCounts,
  sharePercentage,
  sortTasks,
  summarizeTasks,
  TASK_SORTS,
  TaskSort,
  TaskTab,
  TASKS_PER_PAGE,
  taskProjectOptions,
  tasksPerInstitution,
} from './dashboard-tasks';

// The personal dashboard's data and state. The task list's tab, search, project, sort and page
// live in the URL, like the overviews' page: opening a task and coming back keeps the list as it was.
export function useUserDashboard() {
  const { i18n } = useTranslation('dissco-cs');
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [releaseTarget, setReleaseTarget] = useState<MadocCrowdsourcingTaskDto | null>(null);
  const [openThreadId, setOpenThreadId] = useState<number | null>(null);

  const { mutate: releaseTask } = useMutation({
    mutationFn: (task: MadocCrowdsourcingTaskDto) => tasksApi.update(task.id, { status: -1, status_text: 'abandoned' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
    meta: { errorMessage: 'error_release_failed' },
  });

  const { data: tasksData, status: tasksStatus } = useQuery(taskQueries.mine(user?.id));

  // taskQueries.mine (all_tasks: true) is forwarded as the user, so it only ever returns the calling
  // user's own tasks for a non-admin contributor (see docs/MANIFEST-CLAIMS.md) — so the site-wide
  // total has to come from the backend-computed stats instead, same as the homepage banner.
  const { data: siteStats } = useSiteStats();

  const { data: unansweredCount = 0 } = useQuery({
    ...forumQueries.topics(),
    select: topics => topics.filter(topic => topic.replyCount === 0).length,
    enabled: !!user,
  });
  const { data: institutionLinks } = useQuery(projectQueries.institutionLinks());
  const { data: institutions } = useQuery(institutionQueries.active());

  const { data: feedbackThreads = [], status: feedbackStatus } = useQuery({ ...feedbackQueries.threads(), enabled: !!user });

  const tab: TaskTab = searchParams.get('tab') === 'done' ? 'done' : 'saved';
  const query = searchParams.get('q') ?? '';
  const projectId = searchParams.get('project') ?? '';
  const sortParam = searchParams.get('sort') as TaskSort | null;
  const sort: TaskSort = sortParam && TASK_SORTS.includes(sortParam) ? sortParam : 'date';

  // Every change but the page itself starts the list again on page 1. Typing in the search box
  // replaces the history entry, so the back button does not step through every letter.
  const setParam = (key: string, value: string, { replace = false } = {}) => {
    setSearchParams(
      params => {
        if (value) params.set(key, value);
        else params.delete(key);
        if (key !== 'page') params.delete('page');
        return params;
      },
      { replace }
    );
  };

  const userName = user?.name ?? '';
  const summary = summarizeTasks(tasksData?.tasks ?? []);
  const tabTasks = tab === 'saved' ? summary.savedTasks : summary.doneTasks;
  const shownTasks = sortTasks(filterTasks(tabTasks, { query, projectId }, i18n.language, userName), sort, i18n.language, userName);
  const totalPages = pageCount(shownTasks.length, TASKS_PER_PAGE);
  // Capped on render, not written back: while loading there is one page only.
  const page = Math.min(parsePageParam(searchParams.get('page')), totalPages);

  return {
    user,
    summary,
    percentage: sharePercentage(summary.userDoneCount, siteStats?.tasksCompleted ?? 0),
    tasksLoading: tasksStatus === 'pending',
    list: {
      tab,
      setTab: (next: TaskTab) => setParam('tab', next === 'done' ? 'done' : ''),
      query,
      setQuery: (value: string) => setParam('q', value, { replace: true }),
      projectId,
      setProjectId: (value: string) => setParam('project', value),
      projectOptions: taskProjectOptions(summary.contributedTasks, i18n.language),
      sort,
      setSort: (value: TaskSort) => setParam('sort', value === 'date' ? '' : value),
      tasks: pageSlice(shownTasks, page, TASKS_PER_PAGE),
      total: shownTasks.length,
      tabTotal: tabTasks.length,
      page,
      totalPages,
      setPage: (value: number) => setParam('page', value > 1 ? String(value) : ''),
    },
    year: {
      months: monthlyCounts(summary.doneTasks, new Date()),
      first: firstContribution(summary.contributedTasks),
      doneCount: summary.doneTasks.length,
    },
    // Only institutions that are still active; a count for one that was switched off is left out.
    helpedInstitutions: tasksPerInstitution(summary.doneTasks, institutionLinks ?? {}).flatMap(({ institutionId, count }) => {
      const institution = institutions?.find(candidate => candidate.id === institutionId);
      return institution ? [{ institution, count }] : [];
    }),
    unansweredCount,
    feedback: {
      threads: feedbackThreads,
      loading: feedbackStatus === 'pending',
      unread: feedbackThreads.reduce((sum, thread) => sum + thread.unreadCount, 0),
      openThreadId,
      toggleThread: (id: number) => setOpenThreadId(current => (current === id ? null : id)),
    },
    release: {
      target: releaseTarget,
      ask: setReleaseTarget,
      confirm: () => {
        if (releaseTarget) releaseTask(releaseTarget);
        setReleaseTarget(null);
      },
      cancel: () => setReleaseTarget(null),
    },
  };
}

export type UserDashboardState = ReturnType<typeof useUserDashboard>;
