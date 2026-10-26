import { MadocCrowdsourcingTaskDto } from '@dissco-cs/shared-types';
import { localeText } from '../../utility/locale-text';
import { taskDisplayName } from '../../utility/task-display-name';

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

// ---- the "My tasks" list: filter, sort, project options ----

export type TaskTab = 'saved' | 'done';
export type TaskSort = 'date' | 'name' | 'project';
export const TASK_SORTS: TaskSort[] = ['date', 'name', 'project'];
export const TASKS_PER_PAGE = 10;

/**
 * The name of a task's project in the given language, falling back to its slug.
 * @param task the task (MadocCrowdsourcingTaskDto), its project from metadata.project
 * @param language the site language (i18n.language)
 * Returns: the name, or '' when the task has no project.
 */
export function taskProjectName(task: MadocCrowdsourcingTaskDto, language: string): string {
  const project = task.metadata?.project;
  return project ? localeText(project.label, language) || project.slug : '';
}

/**
 * The tasks matching a search text (in the task's name or its project's name, ignoring case) and,
 * when one is chosen, a project.
 * @param tasks the tasks of one tab
 * @param filter `query` the search text ('' for all), `projectId` a project id as a string ('' for all)
 * @param language the site language, for the project names
 * @param userName the user's name, stripped from the task names before searching
 * Returns: the matching tasks, in the same order.
 */
export function filterTasks(
  tasks: MadocCrowdsourcingTaskDto[],
  { query, projectId }: { query: string; projectId: string },
  language: string,
  userName: string
): MadocCrowdsourcingTaskDto[] {
  const needle = query.trim().toLowerCase();
  return tasks.filter(task => {
    if (projectId && String(task.metadata?.project?.id ?? '') !== projectId) return false;
    if (!needle) return true;
    return (
      taskDisplayName(task, userName).toLowerCase().includes(needle) ||
      taskProjectName(task, language).toLowerCase().includes(needle)
    );
  });
}

/**
 * The tasks in the chosen order: 'date' most recently modified first; 'name' and 'project'
 * alphabetically, in the site language's order.
 * @param tasks the tasks to sort (not changed)
 * @param sort the order
 * @param language the site language, for comparing names
 * @param userName the user's name, stripped from the task names
 * Returns: a new, sorted array.
 */
export function sortTasks(tasks: MadocCrowdsourcingTaskDto[], sort: TaskSort, language: string, userName: string): MadocCrowdsourcingTaskDto[] {
  const compare = new Intl.Collator(language).compare;
  const sorted = tasks.slice();
  if (sort === 'date') {
    return sorted.sort((a, b) => (b.modified_at ?? 0) - (a.modified_at ?? 0));
  }
  const key = sort === 'name' ? (task: MadocCrowdsourcingTaskDto) => taskDisplayName(task, userName) : (task: MadocCrowdsourcingTaskDto) => taskProjectName(task, language);
  return sorted.sort((a, b) => compare(key(a), key(b)));
}

/**
 * The projects to choose from in the filter: every project the user has a task in, by name.
 * @param tasks all of the user's tasks
 * @param language the site language, for the names
 * Returns: one { id, name } per project, the id as a string.
 */
export function taskProjectOptions(tasks: MadocCrowdsourcingTaskDto[], language: string): { id: string; name: string }[] {
  const options = new Map<string, string>();
  for (const task of tasks) {
    const project = task.metadata?.project;
    if (project) options.set(String(project.id), taskProjectName(task, language));
  }
  const compare = new Intl.Collator(language).compare;
  return Array.from(options, ([id, name]) => ({ id, name })).sort((a, b) => compare(a.name, b.name));
}

// ---- "Your year" ----
// Months are counted on a task's modified_at, the only date the task list has: a task a reviewer
// accepts a month later can move to that month. Good enough for a personal overview.

export interface MonthCount {
  year: number;
  // 0 for January, as in Date.
  month: number;
  count: number;
}

/**
 * The number of tasks per calendar month, for the last `months` months up to and including now.
 * @param tasks the tasks to count (the user's done tasks)
 * @param now the current moment, a parameter so the months can be tested
 * @param months how many months, the current one included
 * Returns: one entry per month, oldest first; a month without tasks counts 0.
 */
export function monthlyCounts(tasks: MadocCrowdsourcingTaskDto[], now: Date, months = 12): MonthCount[] {
  const result: MonthCount[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: start.getFullYear(), month: start.getMonth(), count: 0 });
  }
  for (const task of tasks) {
    if (!task.modified_at) continue;
    const date = new Date(task.modified_at);
    const slot = result.find(m => m.year === date.getFullYear() && m.month === date.getMonth());
    if (slot) slot.count++;
  }
  return result;
}

/**
 * The month with the most tasks; on a tie the most recent one.
 * @param months the counts per month (monthlyCounts), oldest first
 * Returns: that month, or null when no month has a task.
 */
export function bestMonth(months: MonthCount[]): MonthCount | null {
  let best: MonthCount | null = null;
  for (const month of months) {
    if (month.count > 0 && (!best || month.count >= best.count)) best = month;
  }
  return best;
}

/**
 * When the user first worked on a task.
 * @param tasks the user's tasks
 * Returns: the earliest modified_at (milliseconds since 1970), or null without dated tasks.
 */
export function firstContribution(tasks: MadocCrowdsourcingTaskDto[]): number | null {
  const dates = tasks.map(task => task.modified_at).filter((date): date is number => !!date);
  return dates.length ? Math.min(...dates) : null;
}

const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

/**
 * The milestone the user works towards, and the one already passed: 10, 25, 50, 100, 250, 500,
 * 1000, and from there every next thousand.
 * @param count the user's number of done tasks
 * Returns: `previous` (0 before the first) and `next`, always above `count`.
 */
export function nextMilestone(count: number): { previous: number; next: number } {
  if (count >= 1000) {
    const next = (Math.floor(count / 1000) + 1) * 1000;
    return { previous: next - 1000, next };
  }
  const next = MILESTONES.find(milestone => milestone > count) ?? 1000;
  const previous = MILESTONES.filter(milestone => milestone <= count).pop() ?? 0;
  return { previous, next };
}

// ---- "Institutions you helped" ----

/**
 * How many tasks the user did per institution, through the institution each task's project is
 * linked to. Tasks of a project without an institution are left out.
 * @param tasks the tasks to count (the user's done tasks)
 * @param links project slug -> institution id (projectsApi.listInstitutionLinks)
 * Returns: one entry per institution, the most tasks first.
 */
export function tasksPerInstitution(tasks: MadocCrowdsourcingTaskDto[], links: Record<string, number>): { institutionId: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const task of tasks) {
    const institutionId = task.metadata?.project ? links[task.metadata.project.slug] : undefined;
    if (institutionId !== undefined) counts.set(institutionId, (counts.get(institutionId) ?? 0) + 1);
  }
  return Array.from(counts, ([institutionId, count]) => ({ institutionId, count })).sort((a, b) => b.count - a.count);
}
