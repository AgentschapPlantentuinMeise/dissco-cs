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
import { getMadocCollectionManifestThumbnails, getMadocProjectManifests } from '../madoc-client/collections.js';
import { getMadocProjectTasks, getMadocTasksBySubjectAndType, resyncManifestTaskCounter } from '../madoc-client/tasks.js';
import { InstitutionsRepository, toInstitutionDto } from '../repositories/institutions.repository.js';
import { validateJson } from '../infrastructure/validate-json.js';
import { safeSegment, siteLang, validateParams } from '../infrastructure/validate-params.js';
import { computeProjectProgress, computeTaskDebug } from './projects.logic.js';
import {
  MadocProjectListPageDto,
  pruneProjectLinksSchema,
  setInstitutionLinkSchema,
  setManualLinkSchema,
} from '@dissco-cs/shared-types';

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
    const [manifestItems, tasks, thumbnails] = await Promise.all([
      getMadocProjectManifests(siteId, project.collection_id),
      getMadocProjectTasks(siteId, project.task_id),
      getMadocCollectionManifestThumbnails(siteId, project.collection_id),
    ]);

    return c.json(computeProjectProgress({ manifestItems, thumbnails, tasks, config: project.config ?? {} }));
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
    const [manifestItems, tasks] = await Promise.all([
      getMadocProjectManifests(identity.siteId, project.collection_id),
      getMadocProjectTasks(identity.siteId, project.task_id),
    ]);

    return c.json(computeTaskDebug(manifestItems, tasks));
  });

  // ---- manual: public read, admin link ----

  app.get('/:projectId/manual', validateParams({ projectId: safeSegment }), async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const manual = await manualsRepository.getManualForProject(siteId, c.req.valid('param').projectId);
    if (!manual) {
      return c.notFound();
    }

    return c.json(toManualDetailDto(manual, await manualsRepository.listAttachmentMeta(manual.id)));
  });

  app.get('/:projectId/manual/attachment/:lang', validateParams({ projectId: safeSegment, lang: siteLang }), async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const { projectId, lang } = c.req.valid('param');

    const manual = await manualsRepository.getManualForProject(siteId, projectId);
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

  app.put('/:projectId/manual-link', validateParams({ projectId: safeSegment }), validateJson(setManualLinkSchema), async c => {
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

    await manualsRepository.setProjectLink(identity.siteId, c.req.valid('param').projectId, input.manualId);
    return c.body(null, 204);
  });

  // ---- institution: public read, admin link ----

  app.get('/:projectId/institution', validateParams({ projectId: safeSegment }), async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const institution = await institutionsRepository.getActiveInstitutionForProjectSlug(siteId, c.req.valid('param').projectId);
    if (!institution) {
      return c.notFound();
    }

    return c.json(toInstitutionDto(institution));
  });

  app.put('/:projectId/institution-link', validateParams({ projectId: safeSegment }), validateJson(setInstitutionLinkSchema), async c => {
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

    await institutionsRepository.setProjectLink(identity.siteId, c.req.valid('param').projectId, input.institutionId);
    return c.body(null, 204);
  });

  return app;
}
