import { MadocCrowdsourcingTaskDto } from '@dissco-cs/shared-types';

/**
 * A task's name without the "<user name>: " prefix Madoc puts in front of every claimed task.
 * @param task the task (MadocCrowdsourcingTaskDto)
 * @param userName the name of the user the task belongs to
 * Returns: the name to show, or '' when the task has none.
 */
export function taskDisplayName(task: MadocCrowdsourcingTaskDto, userName: string): string {
  const prefix = userName + ': ';
  const name = task.name ?? '';
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}
