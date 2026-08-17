import { Hono } from 'hono';

import { resolveSiteId } from '../jwt.js';
import {
  getMadocCollectionManifestThumbnails,
  getMadocCollectionStructure,
  getMadocProject,
  getMadocProjectTasks,
  getMadocTaskStats,
} from '../madoc-client.js';

type MadocProjectSummary = {
  id: number;
  collection_id: number;
  task_id: string;
  config?: {
    maxContributionsPerResource?: number;
    contributionMode?: string;
    claimGranularity?: 'canvas' | 'manifest';
  };
};

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
    let manifestItems: Array<{ id: number; label: unknown; thumbnail?: string }>;
    let canvasTasks: Awaited<ReturnType<typeof getMadocProjectTasks>>;
    try {
      const [structure, stats, tasks, thumbnails] = await Promise.all([
        getMadocCollectionStructure(siteId, project.collection_id),
        getMadocTaskStats(siteId, project.task_id),
        getMadocProjectTasks(siteId, project.task_id),
        getMadocCollectionManifestThumbnails(siteId, project.collection_id),
      ]);
      // De structure-endpoint filtert niet op type -- geeft ook geneste sub-collecties terug,
      // die hier niet aanklikbaar zijn (navigateToFirstCanvas verwacht een manifest-ID).
      manifestItems = (structure.items as Array<{ id: number; label: unknown; type?: string }>)
        .filter(item => item.type?.toLowerCase() === 'manifest')
        .map(item => ({
          ...item,
          thumbnail: thumbnails.get(item.id),
        }));
      manifestCount = manifestItems.length;
      taskStats = stats;
      canvasTasks = tasks;
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

    // Site-brede (niet gebruikersgebonden) status per manifest, zodat "beschikbaar" hetzelfde is
    // voor elke bezoeker. Twee onafhankelijke redenen om een manifest niet meer aan te bieden:
    // (1) al ingediend/geaccepteerd -- zelfde regel als madoc-ts' eigen assign-random-resource.ts
    //     (status 3 altijd, status 2 alleen bij contributionMode 'transcription'), en
    // (2) het contributor-maximum is bereikt (maxContributionsPerResource, projectbreed).
    // claimGranularity bepaalt op welk veld we groeperen: bij 'manifest' is de taak zelf al op
    // het manifest gericht (subject), bij 'canvas' (default) via de canvas z'n subject_parent.
    const config = project.config ?? {};
    const maxContributors = config.maxContributionsPerResource;
    const isTranscriberMode = config.contributionMode === 'transcription';
    const claimGranularity = config.claimGranularity || 'canvas';

    const manifestStats = new Map<string, { contributors: Set<string>; done: boolean }>();
    for (const task of canvasTasks) {
      if (task.status === -1) continue;
      const manifestUrn = claimGranularity === 'manifest' ? task.subject : task.subject_parent;
      if (!manifestUrn) continue;

      let stats = manifestStats.get(manifestUrn);
      if (!stats) {
        stats = { contributors: new Set(), done: false };
        manifestStats.set(manifestUrn, stats);
      }
      if (task.assignee) stats.contributors.add(task.assignee.id);
      if (task.status === 3 || (isTranscriberMode && task.status === 2)) stats.done = true;
    }

    const availableManifests = manifestItems.filter(item => {
      const stats = manifestStats.get(`urn:madoc:manifest:${item.id}`);
      if (!stats) return true;
      if (stats.done) return false;
      if (maxContributors && stats.contributors.size >= maxContributors) return false;
      return true;
    });

    return c.json({
      transcribedPercentage,
      totalTasks: manifestCount,
      allTasksTaken: manifestCount > 0 && availableManifests.length === 0,
      availableManifests: availableManifests.map(item => ({
        id: item.id,
        label: item.label,
        thumbnail: item.thumbnail,
      })),
    });
  });

  return app;
}
