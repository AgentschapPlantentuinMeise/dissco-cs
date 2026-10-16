import { fetchAllTasks, getMadocTaskDetail } from './tasks.js';
import { getMadocProjectByRootTaskId } from './projects.js';
import { MadocCrowdsourcingTaskDto, MadocInternationalString, MadocProjectDto, ReviewTaskDto } from '@dissco-cs/shared-types';

function parseUserId(urn: string | undefined): number | undefined {
  const match = urn?.match(/^urn:madoc:user:(\d+)$/);
  return match ? Number(match[1]) : undefined;
}

function fetchMadocReviewTasks(siteId: number): Promise<MadocCrowdsourcingTaskDto[]> {
  return fetchAllTasks(siteId, {
    type: 'crowdsourcing-review',
    all_tasks: 'true',
    status: '0,1,2',
    detail: 'true',
  });
}

/**
 * Every open review task of the site, across all projects, with its submitter, reviewer and
 * project. Open = status 0 (not started), 1 (to handle) or 2 (in review), as in Madoc's own
 * REVIEW_STATUS_MAP. Per task this also asks Madoc for the original task (the submitter and the
 * revision) and, once per project, the project. Uses the service token.
 * @param siteId the site
 * Returns: ReviewTaskDto[]. A failed lookup of a submitter or project leaves those fields empty
 *   instead of failing the whole list.
 */
export async function getMadocReviewTasks(siteId: number): Promise<ReviewTaskDto[]> {
  const tasks = await fetchMadocReviewTasks(siteId);
  const projectByRootTask = new Map<string, MadocProjectDto | null>();

  const rows: ReviewTaskDto[] = [];
  for (const task of tasks) {
    let submitter: string | undefined;
    let submitterId: number | undefined;
    let revisionId: string | undefined;
    const originalTaskId = typeof task.parameters?.[0] === 'string' ? (task.parameters[0] as string) : undefined;
    if (originalTaskId) {
      try {
        const originalTask = await getMadocTaskDetail(siteId, originalTaskId);
        submitter = originalTask.assignee?.name;
        submitterId = parseUserId(originalTask.assignee?.id);
        revisionId = originalTask.state?.revisionId;
        if (!revisionId) {
          console.warn('[review] original task has no state.revisionId', {
            reviewTaskId: task.id,
            originalTaskId,
            status: originalTask.status,
            state: originalTask.state,
          });
        }
      } catch (err) {
        console.error('[review] getMadocTaskDetail (submitter) failed', { siteId, originalTaskId }, err);
      }
    }

    // Madoc does not fill in task.metadata.project for review tasks, so the project is looked up
    // through root_task -- once per project.
    let project: MadocProjectDto | null = null;
    if (task.root_task) {
      if (projectByRootTask.has(task.root_task)) {
        project = projectByRootTask.get(task.root_task) ?? null;
      } else {
        try {
          project = await getMadocProjectByRootTaskId(siteId, task.root_task);
        } catch (err) {
          console.error('[review] getMadocProjectByRootTaskId failed', { siteId, rootTask: task.root_task }, err);
        }
        projectByRootTask.set(task.root_task, project);
      }
    }

    rows.push({
      id: task.id,
      project: { id: project?.id, slug: project?.slug, label: project?.label },
      subject: { id: task.metadata?.subject?.id, label: task.metadata?.subject?.label as MadocInternationalString | string | undefined },
      subjectRaw: task.subject,
      subjectParentRaw: task.subject_parent,
      status: task.status,
      statusText: task.status_text,
      submitter,
      submitterId,
      reviewer: task.assignee?.name,
      reviewerId: parseUserId(task.assignee?.id),
      originalTaskId,
      revisionId,
      // Madoc always fills this in for a real task; the shared type marks it optional only for other calls.
      modifiedAt: task.modified_at ?? 0,
    });
  }

  return rows;
}
