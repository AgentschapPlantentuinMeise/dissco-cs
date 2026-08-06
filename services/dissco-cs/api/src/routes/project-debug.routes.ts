import { Hono } from 'hono';

import { requireSiteAdmin } from '../jwt.js';
import { getMadocCollectionStructure, getMadocProject, getMadocProjectTasks, ProjectDebugTask } from '../madoc-client.js';

type MadocProjectSummary = { id: number; collection_id: number; task_id: string };
type CollectionStructureItem = { id: number; label?: unknown };

// Admin-only debugpagina: toont per manifest van een project welke crowdsourcing-task(s)
// er hangen en of ze meetellen als "getranscribeerd" (status 2 of 3, zelfde regel als
// project-progress.routes.ts) -- zodat het percentage op de projectpagina visueel te
// verifiëren is i.p.v. blind vertrouwd te moeten worden.
export function projectDebugRoutes(): Hono {
  const app = new Hono();

  app.get('/:projectId/task-debug', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) return identity;

    const projectId = c.req.param('projectId');

    let project: MadocProjectSummary;
    try {
      project = (await getMadocProject(identity.siteId, projectId)) as MadocProjectSummary;
    } catch (err) {
      console.error('[project-debug] getMadocProject failed', { siteId: identity.siteId, projectId }, err);
      return c.text('Internal Server Error', 500);
    }

    let structure: { items: CollectionStructureItem[] };
    let tasks: ProjectDebugTask[];
    try {
      [structure, tasks] = await Promise.all([
        getMadocCollectionStructure(identity.siteId, project.collection_id) as Promise<{ items: CollectionStructureItem[] }>,
        getMadocProjectTasks(identity.siteId, project.task_id),
      ]);
    } catch (err) {
      console.error('[project-debug] fetch failed', { siteId: identity.siteId, projectId }, err);
      return c.text('Internal Server Error', 500);
    }

    // Subject is een manifest- of canvas-urn afhankelijk van de claimGranularity van het
    // project -- bij canvas-granulariteit groeperen we via subject_parent (de manifest-urn).
    const tasksByManifestId = new Map<string, ProjectDebugTask[]>();
    for (const task of tasks) {
      const manifestUrn = task.subject.startsWith('urn:madoc:manifest:')
        ? task.subject
        : task.subject_parent?.startsWith('urn:madoc:manifest:')
          ? task.subject_parent
          : null;
      if (!manifestUrn) continue;

      const manifestId = manifestUrn.replace('urn:madoc:manifest:', '');
      const existing = tasksByManifestId.get(manifestId);
      if (existing) {
        existing.push(task);
      } else {
        tasksByManifestId.set(manifestId, [task]);
      }
    }

    const manifests = structure.items.map(item => {
      const manifestTasks = tasksByManifestId.get(String(item.id)) ?? [];
      return {
        manifestId: item.id,
        label: item.label,
        countsAsTranscribed: manifestTasks.some(t => t.status === 2 || t.status === 3),
        tasks: manifestTasks.map(t => ({
          id: t.id,
          status: t.status,
          status_text: t.status_text,
          assignee: t.assignee?.name,
          modified_at: t.modified_at,
        })),
      };
    });

    const transcribedCount = manifests.filter(m => m.countsAsTranscribed).length;
    const transcribedPercentage = manifests.length === 0 ? 0 : Math.round((transcribedCount / manifests.length) * 100);

    return c.json({ totalManifests: manifests.length, transcribedPercentage, manifests });
  });

  return app;
}
