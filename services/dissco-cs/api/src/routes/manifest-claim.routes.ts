import { Hono } from 'hono';

import { resolveSiteId, requestMadocUserIdentity } from '../jwt.js';
import { getMadocProject, getMadocTasksBySubjectAndType, resyncManifestTaskCounter } from '../madoc-client.js';

type MadocProjectSummary = { id: number; task_id: string };

export function manifestClaimRoutes(): Hono {
  const app = new Hono();

  // Madoc-ts herberekent de gedeelde manifest-teller (max-contributors) alleen wanneer een
  // NIEUWE claim wordt aangemaakt (subtask_created-event in madoc-ts's
  // gateway/tasks/crowdsourcing-manifest-task.ts), nooit wanneer een bestaande claim wordt
  // losgelaten. Bij maxContributors:1 blijft een manifest daardoor voor iedereen (incl. de
  // gebruiker die net losliet) potentieel voor altijd geblokkeerd. Dit endpoint herberekent
  // de teller meteen na een abandon, met dezelfde regel als madoc-ts's syncManifestTaskStatus.
  app.post('/:projectId/manifests/:manifestId/resync-claim', async c => {
    const identity = requestMadocUserIdentity(c);
    if (!identity) {
      return c.text('Unauthorized', 401);
    }

    const siteId = await resolveSiteId(c);
    if (siteId === null) {
      return c.text('Could not resolve site', 400);
    }

    const projectId = c.req.param('projectId');
    const manifestId = c.req.param('manifestId');

    let project: MadocProjectSummary;
    try {
      project = (await getMadocProject(siteId, projectId)) as MadocProjectSummary;
    } catch (err) {
      console.error('[manifest-claim] getMadocProject failed', { siteId, projectId }, err);
      return c.text('Internal Server Error', 500);
    }

    let containerTaskId: string | undefined;
    try {
      const { tasks } = await getMadocTasksBySubjectAndType(
        siteId,
        `urn:madoc:manifest:${manifestId}`,
        'crowdsourcing-manifest-task'
      );
      containerTaskId = tasks[0]?.id;
    } catch (err) {
      console.error('[manifest-claim] task lookup failed', { siteId, projectId, manifestId }, err);
      return c.text('Internal Server Error', 500);
    }

    if (!containerTaskId) {
      // Nog geen manifest-taak aangemaakt voor dit manifest — niets te hersynchroniseren.
      return c.json({ resynced: false });
    }

    try {
      const resynced = await resyncManifestTaskCounter(siteId, containerTaskId);
      return c.json({ resynced });
    } catch (err) {
      console.error('[manifest-claim] task resync failed', { siteId, containerTaskId }, err);
      return c.text('Internal Server Error', 500);
    }
  });

  return app;
}
