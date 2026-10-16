import { Hono } from 'hono';

import { ManualsRepository, toManualDetailDto } from '../repositories/manuals.repository.js';
import { requestBearerToken, requireSiteAdmin, requireUser, requireSiteId } from '../auth/auth.js';
import { appConfig } from '../config.js';
import {
  forwardJsonBody,
  madocErrorResponse,
  madocFetch,
  madocJson,
  publicSitePath,
  readJsonBody,
  relayMadocResponse,
} from '../madoc-client/client.js';
import { collectAllPages } from '../madoc-client/pagination.js';
import { getMadocProject } from '../madoc-client/projects.js';
import {
  getMadocCollectionManifestThumbnails,
  getMadocCollectionStructure,
  getMadocProjectManifestsAndTaskStats,
} from '../madoc-client/collections.js';
import { getMadocProjectTasks, getMadocTasksBySubjectAndType, resyncManifestTaskCounter } from '../madoc-client/tasks.js';
import { InstitutionsRepository, toInstitutionDto } from '../repositories/institutions.repository.js';
import { validateJson } from '../infrastructure/validate-json.js';
import { safeSegment, validateParams } from '../infrastructure/validate-params.js';
import {
  isSitePageLang,
  MadocCrowdsourcingTaskDto,
  MadocInternationalString,
  MadocProjectListPageDto,
  ProjectDebugDto,
  ProjectProgressDto,
  pruneProjectLinksSchema,
  setInstitutionLinkSchema,
  setManualLinkSchema,
} from '@dissco-cs/shared-types';

type CollectionStructureItem = { id: number; label?: unknown };

// Routes with a fixed path (such as /institution-links) are registered before the routes with a
// /:projectId placeholder. Hono tries routes in the order they are registered, so otherwise
// /:projectId would also catch 'institution-links', as if it were a project id.
export function projectsController(institutionsRepository: InstitutionsRepository, manualsRepository: ManualsRepository): Hono {
  const app = new Hono();

  // ---- admin: project <-> institution / manual links, site-wide ----

  app.get('/institution-links', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const links = await institutionsRepository.listProjectLinks(identity.siteId);
    return c.json({ links });
  });

  app.post('/institution-links/prune', validateJson(pruneProjectLinksSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const input = c.req.valid('json');

    const removed = await institutionsRepository.pruneOrphanedProjectLinks(identity.siteId, input.liveSlugs);
    return c.json({ removed });
  });

  app.post('/manual-links/prune', validateJson(pruneProjectLinksSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const input = c.req.valid('json');

    const removed = await manualsRepository.pruneOrphanedProjectLinks(identity.siteId, input.liveSlugs);
    return c.json({ removed });
  });

  // ---- public: project list + detail (Madoc's site API, forwarded as the visitor) ----

  app.get('/', async c => {
    const query = new URLSearchParams();
    const published = c.req.query('published');
    if (published !== undefined) {
      query.set('published', published);
    }

    const userToken = requestBearerToken(c);
    const pagePath = (page: string) => {
      const pageQuery = new URLSearchParams(query);
      pageQuery.set('page', page);
      return publicSitePath(c, `/projects?${pageQuery}`);
    };

    if (c.req.query('all') !== 'true') {
      const page = c.req.query('page') ?? '1';
      const path = /^\d+$/.test(page) ? pagePath(page) : null;
      if (!path) {
        return c.json({ error: 'Invalid slug or page' }, 400);
      }
      return relayMadocResponse(await madocFetch(path, userToken));
    }

    if (!pagePath('1')) {
      return c.json({ error: 'Invalid slug' }, 400);
    }

    try {
      const projects = await collectAllPages(async page => {
        const data = await madocJson<MadocProjectListPageDto>(pagePath(String(page)) as string, userToken);
        return { items: data.projects || [], totalPages: data.pagination?.totalPages };
      }, appConfig.madocPageConcurrency);
      return c.json({ projects });
    } catch (err) {
      return madocErrorResponse(err);
    }
  });

  app.get('/:projectId', validateParams({ projectId: safeSegment }), async c => {
    const { projectId } = c.req.valid('param');
    const path = publicSitePath(c, `/projects/${projectId}`);
    if (!path) {
      return c.json({ error: 'Invalid slug' }, 400);
    }

    return relayMadocResponse(await madocFetch(path, requestBearerToken(c)));
  });

  // ---- admin: project lifecycle (bulk create), forwarded as the admin ----

  // The site-admin check in these routes is only a quick early stop. POST /projects has the same
  // URL as the public project list, and for that URL the gateway does not check the login token.
  // The real permission check is Madoc's, on the user's own token that we pass on -- so never
  // send these calls with the service token, which is allowed to do everything.

  app.post('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const body = await readJsonBody(c);
    if (body instanceof Response) {
      return body;
    }

    return relayMadocResponse(await madocFetch('/api/madoc/projects', requestBearerToken(c), { method: 'POST', body }));
  });

  app.get('/:projectId/export', validateParams({ projectId: safeSegment }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { projectId } = c.req.valid('param');

    return relayMadocResponse(await madocFetch(`/api/madoc/projects/${projectId}/export`, requestBearerToken(c)));
  });

  app.get('/:projectId/structure', validateParams({ projectId: safeSegment }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { projectId } = c.req.valid('param');

    return relayMadocResponse(await madocFetch(`/api/madoc/projects/${projectId}/structure`, requestBearerToken(c)));
  });

  app.put('/:projectId/status', validateParams({ projectId: safeSegment }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { projectId } = c.req.valid('param');

    const body = await readJsonBody(c);
    if (body instanceof Response) {
      return body;
    }

    return relayMadocResponse(
      await madocFetch(`/api/madoc/projects/${projectId}/status`, requestBearerToken(c), { method: 'PUT', body })
    );
  });

  // ---- logged-in user: picking and claiming work, forwarded as the volunteer ----

  // These four routes pass the request to Madoc unchanged and return Madoc's answer unchanged,
  // status code included. Keep it that way: the annotate page reacts to Madoc's own codes. For
  // example, Madoc answers 404 (not 403) when the user has no access to the project, and the page
  // then shows its "no access" message.
  for (const action of ['random', 'prepare-claim', 'claim', 'revoke-claim'] as const) {
    app.post(`/:projectId/${action}`, validateParams({ projectId: safeSegment }), async c => {
      const { projectId } = c.req.valid('param');

      return forwardJsonBody(c, `/api/madoc/projects/${projectId}/${action}`, 'POST', requestBearerToken(c));
    });
  }

  // ---- public: progress ----

  app.get('/:projectId/progress', validateParams({ projectId: safeSegment }), async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const { projectId } = c.req.valid('param');

    const project = await getMadocProject(siteId, projectId);
    const [{ manifestItems: rawManifestItems, taskStats }, canvasTasks, thumbnails] = await Promise.all([
      getMadocProjectManifestsAndTaskStats(siteId, project.collection_id, project.task_id),
      getMadocProjectTasks(siteId, project.task_id),
      getMadocCollectionManifestThumbnails(siteId, project.collection_id),
    ]);
    const manifestItems = rawManifestItems.map(item => ({
      ...item,
      thumbnail: thumbnails.get(item.id),
    }));
    const manifestCount = manifestItems.length;

    const taskStatuses = taskStats.statuses || {};
    const inReview = taskStatuses['2'] || 0;
    const completed = taskStatuses['3'] || 0;

    const transcribedPercentage =
      manifestCount === 0
        ? 0
        : Math.round(((Math.max(inReview, 0) + Math.max(completed, 0)) / manifestCount) * 100);

    // Which manifests can still be picked -- the same for every visitor, not per user. A manifest
    // is no longer offered when:
    // - it is done: status 3 (accepted), or status 2 (submitted) when the project is in
    //   'transcription' mode. This is the rule Madoc itself uses (assign-random-resource.ts).
    // - enough volunteers already work on it (the project's maxContributionsPerResource).
    // A task points to its manifest through `subject` when the project hands out whole manifests,
    // or through `subject_parent` (the manifest of the image) when it hands out single images.
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

    const result: ProjectProgressDto = {
      transcribedPercentage,
      totalTasks: manifestCount,
      allTasksTaken: manifestCount > 0 && availableManifests.length === 0,
      availableManifests: availableManifests.map(item => ({
        id: item.id,
        label: item.label,
        thumbnail: item.thumbnail,
      })),
    };
    return c.json(result);
  });

  // ---- logged-in user: manifest claim resync ----

  // Madoc only recounts how many volunteers work on a manifest when someone claims it, not when
  // someone lets it go. Without this route, a manifest that was full would stay blocked for
  // everyone after a volunteer released it.
  app.post('/:projectId/manifests/:manifestId/resync-claim', validateParams({ projectId: safeSegment, manifestId: safeSegment }), async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { projectId, manifestId } = c.req.valid('param');

    // Called only to check that the project exists on this site (it throws otherwise), before any
    // of its tasks is touched.
    await getMadocProject(identity.siteId, projectId);

    const { tasks } = await getMadocTasksBySubjectAndType(
      identity.siteId,
      `urn:madoc:manifest:${manifestId}`,
      'crowdsourcing-manifest-task'
    );
    const containerTaskId = tasks[0]?.id;
    if (!containerTaskId) {
      return c.json({ resynced: false });
    }

    const resynced = await resyncManifestTaskCounter(identity.siteId, containerTaskId);
    return c.json({ resynced });
  });

  // ---- admin: task debug ----

  app.get('/:projectId/task-debug', validateParams({ projectId: safeSegment }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { projectId } = c.req.valid('param');

    const project = await getMadocProject(identity.siteId, projectId);
    const [structure, tasks] = await Promise.all([
      getMadocCollectionStructure(identity.siteId, project.collection_id) as Promise<{ items: CollectionStructureItem[] }>,
      getMadocProjectTasks(identity.siteId, project.task_id),
    ]);

    // A task points to a manifest, or to a single image whose parent is the manifest -- depending on
    // whether the project hands out whole manifests or single images.
    const tasksByManifestId = new Map<string, MadocCrowdsourcingTaskDto[]>();
    for (const task of tasks) {
      const manifestUrn =
        task.subject && task.subject.startsWith('urn:madoc:manifest:')
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
        label: item.label as MadocInternationalString | string | undefined,
        countsAsTranscribed: manifestTasks.some(t => t.status === 2 || t.status === 3),
        tasks: manifestTasks.map(t => ({
          id: t.id,
          status: t.status,
          statusText: t.status_text,
          assignee: t.assignee?.name,
          // Madoc always fills this in for a real task; the shared type marks it optional only
          // because other calls may lack it.
          modifiedAt: t.modified_at ?? 0,
        })),
      };
    });

    const transcribedCount = manifests.filter(m => m.countsAsTranscribed).length;
    const transcribedPercentage = manifests.length === 0 ? 0 : Math.round((transcribedCount / manifests.length) * 100);

    const result: ProjectDebugDto = { totalManifests: manifests.length, transcribedPercentage, manifests };
    return c.json(result);
  });

  // ---- manual: public read, admin link ----

  app.get('/:projectId/manual', async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const manual = await manualsRepository.getManualForProject(siteId, c.req.param('projectId'));
    if (!manual) {
      return c.notFound();
    }

    return c.json(toManualDetailDto(manual, await manualsRepository.listAttachmentMeta(manual.id)));
  });

  app.get('/:projectId/manual/attachment/:lang', async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const lang = c.req.param('lang');
    if (!isSitePageLang(lang)) {
      return c.notFound();
    }

    const manual = await manualsRepository.getManualForProject(siteId, c.req.param('projectId'));
    if (!manual) {
      return c.notFound();
    }

    const file = await manualsRepository.getAttachmentFile(manual.id, lang);
    if (!file) {
      return c.notFound();
    }

    c.header('Content-Type', file.mimeType);
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
    return c.body(new Uint8Array(file.buffer));
  });

  app.put('/:projectId/manual-link', validateJson(setManualLinkSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const input = c.req.valid('json');

    if (input.manualId !== null) {
      const manual = await manualsRepository.getManualById(identity.siteId, input.manualId);
      if (!manual) {
        return c.json({ error: 'Manual not found' }, 404);
      }
    }

    await manualsRepository.setProjectLink(identity.siteId, c.req.param('projectId'), input.manualId);
    return c.body(null, 204);
  });

  // ---- institution: public read, admin link ----

  app.get('/:projectId/institution', async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const institution = await institutionsRepository.getActiveInstitutionForProjectSlug(siteId, c.req.param('projectId'));
    if (!institution) {
      return c.notFound();
    }

    return c.json(toInstitutionDto(institution));
  });

  app.put('/:projectId/institution-link', validateJson(setInstitutionLinkSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const input = c.req.valid('json');

    if (input.institutionId !== null) {
      const institution = await institutionsRepository.getInstitutionById(identity.siteId, input.institutionId);
      if (!institution) {
        return c.json({ error: 'Institution not found' }, 404);
      }
    }

    await institutionsRepository.setProjectLink(identity.siteId, c.req.param('projectId'), input.institutionId);
    return c.body(null, 204);
  });

  return app;
}
