import { Hono } from 'hono';

import { MadocUserIdentity, requireUser } from '../jwt.js';
import {
  getMadocProjectByRootTaskId,
  getMadocReviewTasks,
  getMadocSiteUserRole,
  getMadocTaskDetail,
  MadocProjectSummary,
  ReviewTask,
} from '../madoc-client.js';

export type ReviewTaskRow = {
  id: string;
  project: { id?: number; slug?: string; label?: unknown };
  subject: { id?: number; label?: unknown };
  subject_raw?: string;
  subject_parent_raw?: string;
  status: number;
  status_text?: string;
  submitter?: string;
  submitterId?: number;
  reviewer?: string;
  reviewerId?: number;
  originalTaskId?: string;
  revisionId?: string;
  modified_at: number;
};

function parseUserId(urn: string | undefined): number | undefined {
  const match = urn?.match(/^urn:madoc:user:(\d+)$/);
  return match ? Number(match[1]) : undefined;
}

// Zelfde voorwaarde als de frontend's is-reviewer-check: site-admins mogen altijd, anderen
// enkel als hun site-rol effectief 'reviewer' is.
export async function isReviewerOrAdmin(identity: MadocUserIdentity): Promise<boolean> {
  if (identity.scope.includes('site.admin')) return true;
  const role = await getMadocSiteUserRole(identity.siteId, identity.userId);
  return role === 'reviewer';
}

// Eigen reviewer-overzicht: alle site-brede taken die ter review staan, met de toegewezen
// reviewer als kolom -- i.p.v. Madoc's eigen /reviews-pagina.
export function reviewRoutes(): Hono {
  const app = new Hono();

  app.get('/is-reviewer', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) return identity;

    try {
      const role = await getMadocSiteUserRole(identity.siteId, identity.userId);
      return c.json({ isReviewer: role === 'reviewer' });
    } catch (err) {
      console.error('[review] is-reviewer check failed', { siteId: identity.siteId, userId: identity.userId }, err);
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  });

  app.get('/my-tasks', async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) return identity;

    if (!(await isReviewerOrAdmin(identity))) {
      return c.text('Forbidden', 403);
    }

    let tasks: ReviewTask[];
    try {
      tasks = await getMadocReviewTasks(identity.siteId);
    } catch (err) {
      console.error('[review] getMadocReviewTasks failed', { siteId: identity.siteId }, err);
      return c.text('Internal Server Error', 500);
    }

    const projectByRootTask = new Map<string, MadocProjectSummary | null>();

    const rows: ReviewTaskRow[] = [];
    for (const task of tasks) {
      let submitter: string | undefined;
      let submitterId: number | undefined;
      let revisionId: string | undefined;
      const originalTaskId = typeof task.parameters?.[0] === 'string' ? (task.parameters[0] as string) : undefined;
      if (originalTaskId) {
        try {
          const originalTask = await getMadocTaskDetail(identity.siteId, originalTaskId);
          submitter = originalTask.assignee?.name;
          submitterId = parseUserId(originalTask.assignee?.id);
          revisionId = originalTask.state?.revisionId;
          if (!revisionId) {
            console.warn('[review] geen state.revisionId op originele taak', {
              reviewTaskId: task.id,
              originalTaskId,
              status: originalTask.status,
              state: originalTask.state,
            });
          }
        } catch (err) {
          console.error(
            '[review] getMadocTaskDetail (submitter) failed',
            { siteId: identity.siteId, originalTaskId },
            err
          );
        }
      }

      // task.metadata.project is niet gevuld voor crowdsourcing-review-taken (in
      // tegenstelling tot crowdsourcing-task) -- opzoeken via root_task_id, één keer per
      // uniek project.
      let project: MadocProjectSummary | null = null;
      if (task.root_task) {
        if (projectByRootTask.has(task.root_task)) {
          project = projectByRootTask.get(task.root_task) ?? null;
        } else {
          try {
            project = await getMadocProjectByRootTaskId(identity.siteId, task.root_task);
          } catch (err) {
            console.error('[review] getMadocProjectByRootTaskId failed', { siteId: identity.siteId, rootTask: task.root_task }, err);
          }
          projectByRootTask.set(task.root_task, project);
        }
      }

      rows.push({
        id: task.id,
        project: { id: project?.id, slug: project?.slug, label: project?.label },
        subject: { id: task.metadata?.subject?.id, label: task.metadata?.subject?.label },
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
        modified_at: task.modified_at,
      });
    }

    return c.json({ tasks: rows });
  });

  return app;
}
