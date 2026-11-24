import { MadocCrowdsourcingTaskDto, MadocInternationalString, MadocProjectDto, ReviewTaskDto, ReviewTaskListDto } from '@dissco-cs/shared-types';

// The volunteer's task a review is about: it holds the submitter (its assignee) and the revision
// the volunteer saved.
export type OriginalTask = Pick<MadocCrowdsourcingTaskDto, 'id' | 'assignee' | 'state'>;

// What madoc-client gathered for a reviewer's list: their review tasks, the original tasks and
// projects it could find, and the errors of the lookups that failed.
export type ReviewLookup = {
  reviewTasks: MadocCrowdsourcingTaskDto[];
  originalsById: Map<string, OriginalTask>;
  projectByRootTask: Map<string, MadocProjectDto | null>;
  errors: unknown[];
};

/** A Madoc user urn ('urn:madoc:user:5') -> 5; undefined for anything else. */
export function parseUserId(urn: string | undefined): number | undefined {
  const match = urn?.match(/^urn:madoc:user:(\d+)$/);
  return match ? Number(match[1]) : undefined;
}

/**
 * The id of the task a review is about. Madoc puts nothing else of it in the review task: no
 * submitter, no revision (crowdsourcing-review.ts, createTask), only its id as first parameter.
 */
export function originalTaskIdOf(reviewTask: MadocCrowdsourcingTaskDto): string | undefined {
  const first = reviewTask.parameters?.[0];
  return typeof first === 'string' ? first : undefined;
}

/** The ids of the original tasks of these reviews that are not in `originalsById`, each once. */
export function missingOriginalTaskIds(reviewTasks: MadocCrowdsourcingTaskDto[], originalsById: Map<string, OriginalTask>): string[] {
  const ids = reviewTasks.flatMap(task => {
    const id = originalTaskIdOf(task);
    return id !== undefined && !originalsById.has(id) ? [id] : [];
  });
  return [...new Set(ids)];
}

/**
 * One row of the review list. Without its original task the submitter and revision stay empty;
 * without its project, the project fields.
 */
export function toReviewTaskRow(task: MadocCrowdsourcingTaskDto, original: OriginalTask | undefined, project: MadocProjectDto | null | undefined): ReviewTaskDto {
  return {
    id: task.id,
    project: { id: project?.id, slug: project?.slug, label: project?.label },
    subject: { id: task.metadata?.subject?.id, label: task.metadata?.subject?.label as MadocInternationalString | string | undefined },
    subjectRaw: task.subject,
    subjectParentRaw: task.subject_parent,
    status: task.status,
    statusText: task.status_text,
    submitter: original?.assignee?.name,
    submitterId: parseUserId(original?.assignee?.id),
    reviewer: task.assignee?.name,
    reviewerId: parseUserId(task.assignee?.id),
    originalTaskId: originalTaskIdOf(task),
    revisionId: original?.state?.revisionId,
    // Madoc always fills this in for a real task; the shared type marks it optional only for other calls.
    modifiedAt: task.modified_at ?? 0,
  };
}

/**
 * The reviewer's list: one row per review task. Marked incomplete when a lookup failed; the rows
 * it concerns are still listed, with their submitter and revision (and project) empty.
 */
export function toReviewTaskListDto(lookup: ReviewLookup): ReviewTaskListDto {
  const tasks = lookup.reviewTasks.map(task => {
    const originalId = originalTaskIdOf(task);
    return toReviewTaskRow(
      task,
      originalId === undefined ? undefined : lookup.originalsById.get(originalId),
      task.root_task ? lookup.projectByRootTask.get(task.root_task) : null
    );
  });
  return { tasks, incomplete: lookup.errors.length > 0 };
}
