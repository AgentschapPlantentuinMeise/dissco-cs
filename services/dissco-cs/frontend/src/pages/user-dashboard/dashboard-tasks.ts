import { MadocCrowdsourcingTaskDto } from '@dissco-cs/shared-types';

export interface ProjectTaskCount {
  id: string;
  value: number;
  project: NonNullable<NonNullable<MadocCrowdsourcingTaskDto['metadata']>['project']>;
}

export interface TaskSummary {
  savedTasks: MadocCrowdsourcingTaskDto[];
  doneTasks: MadocCrowdsourcingTaskDto[];
  // Every task the user worked on, one per object (saved, submitted, reviewed, ...).
  contributedTasks: MadocCrowdsourcingTaskDto[];
  // The backend's own definition of "completed" (status 2 or 3, see fetchSiteTaskTotals in
  // madoc-db/stats.repository.ts), so it lines up with siteStats.tasksCompleted.
  userDoneCount: number;
  projectCount: number;
  projectTaskCounts: ProjectTaskCount[];
}

// The user's task list as the dashboard shows it: duplicates removed, unstarted (0) and abandoned
// (-1) claims left out, and only the latest task per object (subject + root task).
export function summarizeTasks(tasks: MadocCrowdsourcingTaskDto[]): TaskSummary {
  const seen = new Set<string>();
  const uniqueTasks = tasks.filter(task => {
    const id = task.id ?? '';
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const realTasks = uniqueTasks.filter(task => task.status !== 0 && task.status !== -1);
  const latestPerSubject = new Map<string, MadocCrowdsourcingTaskDto>();
  for (const task of realTasks) {
    const key = `${task.subject ?? task.id}|${task.root_task ?? ''}`;
    const existing = latestPerSubject.get(key);
    if (!existing || (task.modified_at ?? '') > (existing.modified_at ?? '')) {
      latestPerSubject.set(key, task);
    }
  }
  const contributedTasks = Array.from(latestPerSubject.values());

  const projectTaskCounts = new Map<string, ProjectTaskCount>();
  for (const task of contributedTasks) {
    const project = task.metadata?.project;
    if (!project) continue;
    const id = String(project.id);
    projectTaskCounts.set(id, { id, value: (projectTaskCounts.get(id)?.value ?? 0) + 1, project });
  }

  return {
    savedTasks: contributedTasks.filter(task => task.status === 1),
    doneTasks: contributedTasks.filter(task => task.status === 2 || task.status === 3 || task.status === 5),
    contributedTasks,
    userDoneCount: uniqueTasks.filter(task => task.status === 2 || task.status === 3).length,
    projectCount: projectTaskCounts.size,
    projectTaskCounts: Array.from(projectTaskCounts.values()),
  };
}

// The user's share of all completed tasks on the site, as "12.34", or null when there are none yet.
export function sharePercentage(userDoneCount: number, siteTotal: number): string | null {
  return siteTotal > 0 ? ((userDoneCount / siteTotal) * 100).toFixed(2) : null;
}
