import { appConfig } from '../config.js';
import { getServiceJwt } from './client.js';

export async function getMadocProject(siteId: number, projectId: string): Promise<unknown> {
  const response = await fetch(`${appConfig.madocGatewayUrl}/api/madoc/projects/${projectId}`, {
    headers: {
      Authorization: `Bearer ${getServiceJwt()}`,
      'x-madoc-site-id': String(siteId),
    },
  });

  if (!response.ok) {
    throw new Error(`Madoc project request failed with status ${response.status}`);
  }

  return response.json();
}

export type MadocProjectSummary = { id: number; slug: string; label?: unknown };

// task.metadata.project turns out to be empty for crowdsourcing-review tasks (unlike
// crowdsourcing-task), so the project is looked up via root_task_id instead -- the same
// filter list-projects.ts already supports server-side.
export async function getMadocProjectByRootTaskId(siteId: number, rootTaskId: string): Promise<MadocProjectSummary | null> {
  const query = new URLSearchParams({ root_task_id: rootTaskId });
  const response = await fetch(`${appConfig.madocGatewayUrl}/api/madoc/projects?${query}`, {
    headers: {
      Authorization: `Bearer ${getServiceJwt()}`,
      'x-madoc-site-id': String(siteId),
    },
  });

  if (!response.ok) {
    throw new Error(`Madoc project-by-root-task request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { projects: MadocProjectSummary[] };
  return data.projects[0] ?? null;
}

export type MadocProjectListItem = { id: number; collection_id: number; task_id: string; status: number };

// All projects on the site regardless of status (including unpublished/finished ones) -- the
// public listProjects route in madoc-ts only shows status 1/2 unless the caller has site.admin
// scope AND sends no `published` query param (see listProjects.ts), which is the case here
// thanks to the service JWT.
export async function listAllMadocProjects(siteId: number): Promise<MadocProjectListItem[]> {
  const projects: MadocProjectListItem[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const query = new URLSearchParams({ page: String(page) });
    const response = await fetch(`${appConfig.madocGatewayUrl}/api/madoc/projects?${query}`, {
      headers: {
        Authorization: `Bearer ${getServiceJwt()}`,
        'x-madoc-site-id': String(siteId),
      },
    });

    if (!response.ok) {
      throw new Error(`Madoc projects-list request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      projects: MadocProjectListItem[];
      pagination?: { totalPages?: number };
    };
    projects.push(...data.projects);
    totalPages = data.pagination?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return projects;
}
