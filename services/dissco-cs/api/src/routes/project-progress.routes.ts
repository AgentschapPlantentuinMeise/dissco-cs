import { Hono } from 'hono';

import { resolveSiteId } from '../jwt.js';
import { getMadocCollectionStructure, getMadocProject, getMadocTaskStats } from '../madoc-client.js';

type MadocProjectSummary = { id: number; collection_id: number; task_id: string };

export function projectProgressRoutes(): Hono {
  const app = new Hono();

  app.get('/:projectId/progress', async c => {
    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const projectId = c.req.param('projectId');

    let project: MadocProjectSummary;
    try {
      project = (await getMadocProject(siteId, projectId)) as MadocProjectSummary;
    } catch (err) {
      console.error('[project-progress] getMadocProject failed', { siteId, projectId }, err);
      return c.text('Internal Server Error', 500);
    }

    let manifestCount: number;
    let taskStats: { statuses: Record<string, number>; total: number };
    try {
      const [structure, stats] = await Promise.all([
        getMadocCollectionStructure(siteId, project.collection_id),
        getMadocTaskStats(siteId, project.task_id),
      ]);
      manifestCount = structure.items.length;
      taskStats = stats;
    } catch (err) {
      console.error('[project-progress] stats fetch failed', {
        siteId,
        projectId,
        collection_id: project.collection_id,
        task_id: project.task_id,
      }, err);
      return c.text('Internal Server Error', 500);
    }

    const taskStatuses = taskStats.statuses || {};
    const inReview = taskStatuses['2'] || 0;
    const completed = taskStatuses['3'] || 0;

    const transcribedPercentage =
      manifestCount === 0
        ? 0
        : Math.round(((Math.max(inReview, 0) + Math.max(completed, 0)) / manifestCount) * 100);

    return c.json({
      transcribedPercentage,
      totalTasks: manifestCount,
    });
  });

  return app;
}
