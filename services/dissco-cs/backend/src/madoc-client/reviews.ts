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

// All still-open review tasks on the site (-1 rejected, 3 accepted and 4/5 handled don't
// count -- 0 not started, 1 to handle ("todo"), 2 in review do, see Madoc's own
// REVIEW_STATUS_MAP in review-listing-page.tsx), site-wide rather than per project: the
// reviewer overview just shows everything up for review, with the assigned reviewer as a column.
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

    // task.metadata.project isn't filled in for crowdsourcing-review tasks (unlike
    // crowdsourcing-task) -- looked up via root_task_id instead, once per unique project.
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
      subject_raw: task.subject,
      subject_parent_raw: task.subject_parent,
      status: task.status,
      status_text: task.status_text,
      submitter,
      submitterId,
      reviewer: task.assignee?.name,
      reviewerId: parseUserId(task.assignee?.id),
      originalTaskId,
      revisionId,
      // tasks-api always returns this for a real task (see MadocCrowdsourcingTaskDto's comment) --
      // the field is only optional in the shared type for other call sites.
      modified_at: task.modified_at ?? 0,
    });
  }

  return rows;
}
