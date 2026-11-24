import { appConfig } from '../config.js';
import { mapInGroups } from './pagination.js';
import { fetchAllTasks, getMadocProjectTasksByStatus, getMadocTaskDetail } from './tasks.js';
import { getMadocProjectByRootTaskId } from './projects.js';
import { missingOriginalTaskIds, OriginalTask, ReviewLookup } from '../logic/review.logic.js';
import { MadocCrowdsourcingTaskDto, MadocProjectDto } from '@dissco-cs/shared-types';

// A task that is under review is submitted (2), or back with its volunteer: changes requested (4),
// or saved again as a draft (1) after that.
const ORIGINAL_TASK_STATUSES = [1, 2, 4];

function fetchMadocReviewTasks(siteId: number, reviewerUserId: number): Promise<MadocCrowdsourcingTaskDto[]> {
  return fetchAllTasks(siteId, {
    type: 'crowdsourcing-review',
    all_tasks: 'true',
    status: '0,1,2',
    detail: 'true',
    assignee: `urn:madoc:user:${reviewerUserId}`,
  });
}

/**
 * The open review tasks assigned to one reviewer, across all projects, plus the tasks under review
 * and the projects they belong to. Open = status 0 (not started), 1 (to handle) or 2 (in review),
 * as in Madoc's own REVIEW_STATUS_MAP. A review task only holds the id of the task under review,
 * so per project (at the same time) this asks Madoc for the project and for its tasks that can be
 * under review; a task not found that way is asked on its own. Uses the service token.
 * @param siteId the site
 * @param reviewerUserId the reviewer's Madoc user id
 * Returns: a ReviewLookup (toReviewTaskListDto turns it into the list). A failed lookup does not
 *   throw: its error is in `errors` and what it would have found is missing. Throws when the
 *   review tasks themselves cannot be fetched.
 */
export async function fetchMadocReviewLookup(siteId: number, reviewerUserId: number): Promise<ReviewLookup> {
  const reviewTasks = await fetchMadocReviewTasks(siteId, reviewerUserId);
  const errors: unknown[] = [];

  const rootTasks = [...new Set(reviewTasks.flatMap(task => (task.root_task ? [task.root_task] : [])))];
  const projectByRootTask = new Map<string, MadocProjectDto | null>();
  const originalsById = new Map<string, OriginalTask>();
  const failedRootTasks = new Set<string>();

  await Promise.all(
    rootTasks.map(async rootTask => {
      const [project, originals] = await Promise.allSettled([
        getMadocProjectByRootTaskId(siteId, rootTask),
        getMadocProjectTasksByStatus(siteId, rootTask, ORIGINAL_TASK_STATUSES),
      ]);
      if (project.status === 'fulfilled') {
        projectByRootTask.set(rootTask, project.value);
      } else {
        errors.push(project.reason);
      }
      if (originals.status === 'fulfilled') {
        for (const task of originals.value) originalsById.set(task.id, task);
      } else {
        errors.push(originals.reason);
        failedRootTasks.add(rootTask);
      }
    })
  );

  // A task under review with a status we did not expect: asked on its own. Not for a project
  // whose lookup failed: that would be one call per review, the very thing this avoids.
  const reachable = reviewTasks.filter(task => !task.root_task || !failedRootTasks.has(task.root_task));
  await mapInGroups(missingOriginalTaskIds(reachable, originalsById), appConfig.madocPageConcurrency, async id => {
    try {
      originalsById.set(id, await getMadocTaskDetail(siteId, id));
    } catch (err) {
      errors.push(err);
    }
  });

  return { reviewTasks, originalsById, projectByRootTask, errors };
}
