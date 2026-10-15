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

// Everything about one Madoc project: progress, claim resync, the admin task-debug view, and the
// project's links to a manual and an institution. Static paths (`/institution-links`,
// `/*-links/prune`) are registered before the `/:projectId/...` routes on purpose -- Hono matches
// in registration order, so a param route registered first would swallow them.
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

  // Cleans up links to projects that no longer appear in the given live Madoc list (e.g. because
  // the project was deleted in Madoc) -- called in the background by the frontend as soon as the
  // project management page has fetched the current project list.
  app.post('/institution-links/prune', validateJson(pruneProjectLinksSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const input = c.req.valid('json');

    const removed = await institutionsRepository.pruneOrphanedProjectLinks(identity.siteId, input.liveSlugs);
    return c.json({ removed });
  });

  // Same background cleanup as /institution-links/prune, for manual links.
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

  // `published` maps straight to Madoc's own filter (status 1 or 2) -- for a site-admin viewer
  // Madoc otherwise returns every project regardless of status unless it is sent explicitly. With
  // `all=true` this walks every page itself (on Madoc's own totalPages) and returns
  // `{ projects }`; otherwise it relays the requested page as-is.
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
  //
  // requireSiteAdmin is only a fast early exit here: POST /projects shares its URL with the public
  // list, where the gateway does not validate the JWT. The real check is Madoc's own, on the
  // forwarded user token -- which is why these must never be sent with the service JWT.

  // Real project-creation route (same one the "New project" / "Duplicate" admin UI uses), so
  // seeded projects go through Madoc's own logic (collection + capture model + root task).
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

  // Exports a project's capture model (+ config) as a reusable template -- same payload shape the
  // "Duplicate project" button passes as `remote_template` when creating a new one.
  app.get('/:projectId/export', validateParams({ projectId: safeSegment }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { projectId } = c.req.valid('param');

    return relayMadocResponse(await madocFetch(`/api/madoc/projects/${projectId}/export`, requestBearerToken(c)));
  });

  // The project's own flat collection id, needed to link manifests/collections to it.
  app.get('/:projectId/structure', validateParams({ projectId: safeSegment }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { projectId } = c.req.valid('param');

    return relayMadocResponse(await madocFetch(`/api/madoc/projects/${projectId}/structure`, requestBearerToken(c)));
  });

  // Same transition as the admin Pause/Resume/Complete/Archive buttons (0 paused, 1 active,
  // 2 published/complete, 3 archived, 4 prepared).
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
  //
  // Madoc's claim routes, unchanged: the body is passed through as-is and Madoc's status codes
  // reach the frontend unchanged (e.g. prepare-claim answers 404, not 403, when the user lacks
  // the site scope -- the annotate page branches on exactly that).
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
    // navigateToFirstCanvas expects a manifest id, hence the manifest filter in the shared helper.
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

    // Site-wide (not user-specific) status per manifest, so "available" is the same for every
    // visitor. Two independent reasons to stop offering a manifest:
    // (1) already submitted/accepted -- same rule as madoc-ts's own assign-random-resource.ts
    //     (status 3 always, status 2 only with contributionMode 'transcription'), and
    // (2) the contributor maximum has been reached (maxContributionsPerResource, project-wide).
    // claimGranularity decides which field we group on: with 'manifest' the task itself already
    // targets the manifest (subject), with 'canvas' (default) via the canvas's subject_parent.
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

  // madoc-ts only recalculates the shared manifest counter (max-contributors) when a NEW claim is
  // created (subtask_created event in madoc-ts's gateway/tasks/crowdsourcing-manifest-task.ts),
  // never when an existing claim is abandoned. With maxContributors:1 a manifest can therefore
  // stay blocked for everyone (including the user who just abandoned it), potentially forever.
  // This endpoint recalculates the counter right after an abandon, using the same rule as
  // madoc-ts's syncManifestTaskStatus.
  app.post('/:projectId/manifests/:manifestId/resync-claim', validateParams({ projectId: safeSegment, manifestId: safeSegment }), async c => {
    const identity = requireUser(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { projectId, manifestId } = c.req.valid('param');

    // Only to make sure the project exists on this site before touching any of its tasks.
    await getMadocProject(identity.siteId, projectId);

    const { tasks } = await getMadocTasksBySubjectAndType(
      identity.siteId,
      `urn:madoc:manifest:${manifestId}`,
      'crowdsourcing-manifest-task'
    );
    const containerTaskId = tasks[0]?.id;
    if (!containerTaskId) {
      // No manifest task created yet for this manifest -- nothing to resync.
      return c.json({ resynced: false });
    }

    const resynced = await resyncManifestTaskCounter(identity.siteId, containerTaskId);
    return c.json({ resynced });
  });

  // ---- admin: task debug ----

  // Admin-only debug view: shows, per manifest of a project, which crowdsourcing task(s) hang off
  // it and whether they count as "transcribed" (status 2 or 3, same rule as /:projectId/progress)
  // -- so the percentage on the project page can be verified visually instead of trusted blindly.
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

    // Subject is a manifest or canvas urn depending on the project's claimGranularity -- with
    // canvas granularity we group via subject_parent (the manifest urn).
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
          // tasks-api always returns this for a real task (see MadocCrowdsourcingTaskDto's comment) --
          // the field is only optional in the shared type for other call sites.
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

  // Link a project to a manual (or unlink with manualId: null).
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

  // Link a project to an institution (or unlink with institutionId: null).
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
