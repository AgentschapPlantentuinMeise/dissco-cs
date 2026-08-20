import { appConfig } from '../config.js';
import { getServiceJwt } from './client.js';

export type ReviewTask = {
  id: string;
  status: number;
  status_text?: string;
  subject: string;
  subject_parent?: string;
  parameters?: unknown[];
  modified_at: number;
  root_task?: string;
  assignee?: { id: string; name?: string };
  metadata?: {
    project?: { id: number; slug: string; label?: unknown };
    subject?: { id: number; type: string; label?: unknown; thumbnail?: string };
  };
};

// All still-open review tasks on the site (-1 rejected, 3 accepted and 4/5 handled don't
// count -- 0 not started, 1 to handle ("todo"), 2 in review do, see Madoc's own
// REVIEW_STATUS_MAP in review-listing-page.tsx), site-wide rather than per project: the
// reviewer overview just shows everything up for review, with the assigned reviewer as a column.
export async function getMadocReviewTasks(siteId: number): Promise<ReviewTask[]> {
  const perPage = 100;
  const tasks: ReviewTask[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const query = new URLSearchParams({
      type: 'crowdsourcing-review',
      all_tasks: 'true',
      status: '0,1,2',
      detail: 'true',
      per_page: String(perPage),
      page: String(page),
    });
    const response = await fetch(`${appConfig.madocGatewayUrl}/api/tasks?${query}`, {
      headers: {
        Authorization: `Bearer ${getServiceJwt()}`,
        'x-madoc-site-id': String(siteId),
      },
    });

    if (!response.ok) {
      throw new Error(`Madoc review-tasks request failed with status ${response.status}`);
    }

    const data = (await response.json()) as { tasks: ReviewTask[]; pagination?: { totalPages?: number } };
    tasks.push(...data.tasks);
    totalPages = data.pagination?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return tasks;
}
