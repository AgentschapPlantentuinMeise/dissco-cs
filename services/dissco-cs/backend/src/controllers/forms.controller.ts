import { Hono } from 'hono';
import { requireSiteAdmin } from '../auth/auth.js';
import { validateJson } from '../infrastructure/validate-json.js';
import { listAllMadocProjects } from '../madoc-client/projects.js';
import { getMadocCaptureModel, listMadocProjectModels } from '../madoc-client/capture-models.js';
import { FormsRepository, toStoredFormDto } from '../repositories/forms.repository.js';
import { InstitutionsRepository } from '../repositories/institutions.repository.js';
import { ManualsRepository } from '../repositories/manuals.repository.js';
import { collectLayoutFields, groupProjectsByFormName, isActiveProject, projectsWithFormName } from '../logic/forms.logic.js';
import { checkFormLayout, formSaveSchema } from '@dissco-cs/shared-types';

// For site admins. Visitors reach a form through a project: /projects/:projectId/form-layout,
// /institution and /manual.
export function formsController(
  formsRepository: FormsRepository,
  institutionsRepository: InstitutionsRepository,
  manualsRepository: ManualsRepository
): Hono {
  const app = new Hono();

  async function allProjectsWithFormName(siteId: number, formName: string) {
    const [projects, models] = await Promise.all([listAllMadocProjects(siteId), listMadocProjectModels(siteId)]);
    return projectsWithFormName(projects, models, formName);
  }

  // Only the active projects count (isActiveProject): archived ones do not block removing a layout,
  // and their fields are not required in it. One Madoc call per project for its model.
  async function fieldsOfProjects(siteId: number, activeProjects: Awaited<ReturnType<typeof allProjectsWithFormName>>) {
    const models = await Promise.all(activeProjects.map(project => getMadocCaptureModel(siteId, project.capture_model_id)));
    return { projectCount: activeProjects.length, fields: collectLayoutFields(models) };
  }

  app.get('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const [projects, models, stored] = await Promise.all([
      listAllMadocProjects(identity.siteId),
      listMadocProjectModels(identity.siteId),
      formsRepository.listForms(identity.siteId),
    ]);
    return c.json({ forms: groupProjectsByFormName(projects, models, stored.map(toStoredFormDto)) });
  });

  app.get('/fields', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const formName = c.req.query('formName');
    if (!formName) {
      return c.json({ error: 'formName is required' }, 400);
    }

    const projects = await allProjectsWithFormName(identity.siteId, formName);
    return c.json(await fieldsOfProjects(identity.siteId, projects.filter(isActiveProject)));
  });

  app.put('/', validateJson(formSaveSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const input = c.req.valid('json');

    // Madoc's whole project list plus its model list: fetched once, and only when a check below
    // needs it.
    let formProjects: ReturnType<typeof allProjectsWithFormName> | undefined;
    const projects = () => (formProjects ??= allProjectsWithFormName(identity.siteId, input.formName));

    if (input.templateProjectId !== null && !(await projects()).some(project => project.id === input.templateProjectId)) {
      return c.json({ error: 'Template project does not use this form' }, 400);
    }
    if (input.institutionId !== null && !(await institutionsRepository.getInstitutionById(identity.siteId, input.institutionId))) {
      return c.json({ error: 'Institution not found' }, 404);
    }
    if (input.manualId !== null && !(await manualsRepository.getManualById(identity.siteId, input.manualId))) {
      return c.json({ error: 'Manual not found' }, 404);
    }

    if (input.layout !== null) {
      // The editor runs the same check before saving, so this only answers a request that skipped it.
      const { fields } = await fieldsOfProjects(identity.siteId, (await projects()).filter(isActiveProject));
      const problems = checkFormLayout(input.layout, fields);
      if (problems.length > 0) {
        return c.json({ error: `Layout breaks its rules: ${problems.map(problem => `${problem.kind} ${problem.term}`).join(', ')}` }, 400);
      }
    } else if ((await formsRepository.getForm(identity.siteId, input.formName))?.layout_items) {
      // Without its layout an active project falls back to Madoc's field order in the middle of the
      // work, so the layout can only go once no active project uses the form.
      if ((await projects()).some(isActiveProject)) {
        return c.json({ error: 'Active projects still use this layout' }, 409);
      }
    }

    await formsRepository.saveForm(identity.siteId, identity.userId, input);
    return c.body(null, 204);
  });

  return app;
}
