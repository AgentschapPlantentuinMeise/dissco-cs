import { queryOptions } from '@tanstack/react-query';
import { tasksApi } from '../cs-client/tasks';
import { MadocCrowdsourcingTaskDto } from '@dissco-cs/shared-types';
import { LIVE } from './freshness';

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
    // The most Madoc's tasks-api gives per page; asking more still returns 50.
    per_page: 50,
  };
}

export const taskQueries = {
  // All of the user's own crowdsourcing tasks, every page, newest first.
  mine: (userId: number | undefined) =>
    queryOptions({
      queryKey: taskKeys.mine(userId),
      queryFn: async () => ({
        tasks: await tasksApi.listAll<MadocCrowdsourcingTaskDto>({ ...mineQuery(userId!), sort_by: 'newest', detail: true }),
      }),
      enabled: !!userId,
      ...LIVE,
    }),

  // The user's own saved-but-not-submitted tasks (status 1), first page.
  mineSaved: (userId: number | undefined) =>
    queryOptions({
      queryKey: taskKeys.mineSaved(userId),
      queryFn: () => tasksApi.list<MadocCrowdsourcingTaskDto>(1, { ...mineQuery(userId!), status: 1, detail: true }),
      enabled: !!userId,
      ...LIVE,
    }),

  detail: (taskId: string | undefined) =>
    queryOptions({ queryKey: taskKeys.detail(taskId), queryFn: () => tasksApi.get(taskId!), enabled: !!taskId, ...LIVE }),

  stuck: () => queryOptions({ queryKey: taskKeys.stuck(), queryFn: () => tasksApi.listStuck(), ...LIVE }),
};
