import { MadocCrowdsourcingTaskDto, MyTaskDto } from '@dissco-cs/shared-types';

/**
 * One of the user's own tasks in the shape the dashboard needs: Madoc's task without its object
 * label, thumbnail, state and parameters.
 * @param task a task from Madoc's task list, asked with detail=true (otherwise subject, root_task
 *   and modified_at are missing)
 * Returns: the MyTaskDto; a field Madoc did not send becomes null.
 */
export function toMyTask(task: MadocCrowdsourcingTaskDto): MyTaskDto {
  const project = task.metadata?.project;
  return {
    id: task.id,
    name: task.name ?? '',
    status: task.status,
    subject: task.subject ?? null,
    subjectParent: task.subject_parent || null,
    rootTask: task.root_task ?? null,
    modifiedAt: task.modified_at ?? null,
    project: project ? { id: project.id, slug: project.slug, label: project.label } : null,
  };
}

export interface ManifestTaskDetail {
  status: number;
  state?: { maxContributors?: number };
  subtasks?: Array<{ type: string; status: number }>;
}

/**
 * Whether a manifest task that Madoc still marks as full should accept volunteers again: it has a
 * maximum, is not open (1), done (3) or rejected (-1), and fewer claims than that maximum are
 * still active (crowdsourcing-task subtasks that were not abandoned).
 * @param detail the manifest task with its state and subtasks (getMadocTaskDetail)
 * Returns: true when it should be set back to status 1.
 */
export function shouldReopenManifest(detail: ManifestTaskDetail): boolean {
  const maximum = detail.state?.maxContributors ? Number(detail.state.maxContributors) : undefined;
  if (!maximum || detail.status === 3 || detail.status === -1 || detail.status === 1) {
    return false;
  }

  const validCount = (detail.subtasks ?? []).filter(t => t.type === 'crowdsourcing-task' && t.status !== -1).length;
  return validCount < maximum;
}
