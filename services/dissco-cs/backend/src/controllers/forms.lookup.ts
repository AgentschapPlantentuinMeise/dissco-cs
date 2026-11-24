import { fromBigint } from '../database/bigint.js';
import { SwrCache } from '../madoc-db/swr-cache.js';
import { listAllMadocProjects } from '../madoc-client/projects.js';
import { listMadocProjectModels } from '../madoc-client/capture-models.js';
import { FormRow, FormsRepository, toStoredFormDto } from '../repositories/forms.repository.js';
import { formNamesBySlug, institutionIdsBySlug, slugsWithFormNames } from './forms.logic.js';
import { MadocProjectStatus, madocProjectVisibility } from '@dissco-cs/shared-types';

type ProjectFormNames = {
  namesBySlug: Record<string, string>;
  statusBySlug: Record<string, MadocProjectStatus>;
};

// Public pages (a project's institution and manual, an institution's projects and numbers) need
// the form name of projects on every visit, and that costs every page of Madoc's project list
// plus its model list. So it is cached: a new project or a renamed model shows up here with up to
// a minute's delay.
const CACHE_TTL_MS = 60_000;
const namesCache = new SwrCache<number, ProjectFormNames>('project-form-names', CACHE_TTL_MS);

function getProjectFormNames(siteId: number): Promise<ProjectFormNames> {
  return namesCache.get(siteId, async () => {
    const [projects, models] = await Promise.all([listAllMadocProjects(siteId), listMadocProjectModels(siteId)]);
    return {
      namesBySlug: formNamesBySlug(projects, models),
      statusBySlug: Object.fromEntries(projects.map(project => [project.slug, project.status])),
    };
  });
}

async function loadNamesAndForms(formsRepository: FormsRepository, siteId: number) {
  const [names, forms] = await Promise.all([getProjectFormNames(siteId), formsRepository.listForms(siteId)]);
  return { ...names, forms: forms.map(toStoredFormDto) };
}

// Null when the project is unknown or nothing is stored for its form.
export async function getProjectForm(formsRepository: FormsRepository, siteId: number, projectSlug: string): Promise<FormRow | null> {
  const name = (await getProjectFormNames(siteId)).namesBySlug[projectSlug];
  return name === undefined ? null : formsRepository.getForm(siteId, name);
}

// Unpublished projects (paused or prepared; every new project, a template too, starts paused) are
// left out of the lists below: a template project shares its form name with the projects copied
// from it, but its images must not count in the institution's numbers, and these lists reach
// visitors and every logged-in user.
function isUnpublished(statusBySlug: Record<string, MadocProjectStatus>, slug: string): boolean {
  return madocProjectVisibility(statusBySlug[slug]) === 'unpublished';
}

// The id may come straight from an InstitutionRow, where pg returns the BIGINT as a string.
export async function listInstitutionProjectSlugs(formsRepository: FormsRepository, siteId: number, institutionId: number | string): Promise<string[]> {
  const { namesBySlug, statusBySlug, forms } = await loadNamesAndForms(formsRepository, siteId);
  const names = forms.filter(form => form.institutionId === fromBigint(institutionId)).map(form => form.formName);
  return slugsWithFormNames(namesBySlug, names).filter(slug => !isUnpublished(statusBySlug, slug));
}

export async function listInstitutionIdsBySlug(formsRepository: FormsRepository, siteId: number): Promise<Record<string, number>> {
  const { namesBySlug, statusBySlug, forms } = await loadNamesAndForms(formsRepository, siteId);
  const publishedNamesBySlug = Object.fromEntries(Object.entries(namesBySlug).filter(([slug]) => !isUnpublished(statusBySlug, slug)));
  return institutionIdsBySlug(publishedNamesBySlug, forms);
}

export async function listManualProjectSlugs(formsRepository: FormsRepository, siteId: number): Promise<Map<number, string[]>> {
  const { namesBySlug, forms } = await loadNamesAndForms(formsRepository, siteId);
  const slugsByManual = new Map<number, string[]>();
  for (const form of forms) {
    if (form.manualId === null) continue;
    const slugs = slugsWithFormNames(namesBySlug, [form.formName]);
    slugsByManual.set(form.manualId, [...(slugsByManual.get(form.manualId) ?? []), ...slugs]);
  }
  return slugsByManual;
}
