import { queryOptions } from '@tanstack/react-query';
import { tasksApi } from '../cs-client/tasks';
import { MadocCrowdsourcingTaskDto } from '@dissco-cs/shared-types';

export const taskKeys = {
  all: ['tasks'] as const,
  mine: (userId: number | undefined) => [...taskKeys.all, 'mine', userId] as const,
  mineSaved: (userId: number | undefined) => [...taskKeys.all, 'mine-saved', userId] as const,
  detail: (taskId: string | undefined) => [...taskKeys.all, 'detail', taskId] as const,
  stuck: () => [...taskKeys.all, 'stuck'] as const,
};

function mineQuery(userId: number) {
  return {
    type: 'crowdsourcing-task',
    all_tasks: true,
    assignee: `urn:madoc:user:${userId}`,
    per_page: 100,
  };
}

export const taskQueries = {
  // All of the user's own crowdsourcing tasks, every page, newest first.
  mine: (userId: number | undefined) =>
    queryOptions({
      queryKey: taskKeys.mine(userId),
      queryFn: async () => {
        const query = { ...mineQuery(userId!), sort_by: 'newest', detail: true };
        const first = await tasksApi.list<MadocCrowdsourcingTaskDto>(1, query);
        const totalPages = first.pagination?.totalPages ?? 1;
        const rest = await Promise.all(
          Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => tasksApi.list<MadocCrowdsourcingTaskDto>(i + 2, query))
        );
        return { ...first, tasks: [...first.tasks, ...rest.flatMap(r => r.tasks)] };
      },
      enabled: !!userId,
    }),

  // The user's own saved-but-not-submitted tasks (status 1), first page.
  mineSaved: (userId: number | undefined) =>
    queryOptions({
      queryKey: taskKeys.mineSaved(userId),
      queryFn: () => tasksApi.list<MadocCrowdsourcingTaskDto>(1, { ...mineQuery(userId!), status: 1, detail: true }),
      enabled: !!userId,
    }),

  detail: (taskId: string | undefined) =>
    queryOptions({ queryKey: taskKeys.detail(taskId), queryFn: () => tasksApi.get(taskId!), enabled: !!taskId }),

  stuck: () => queryOptions({ queryKey: taskKeys.stuck(), queryFn: () => tasksApi.listStuck() }),
};
