import {
  MadocCrowdsourcingTaskDto,
  MadocInternationalString,
  MadocProjectConfig,
  ProjectDebugDto,
  ProjectProgressDto,
} from '@dissco-cs/shared-types';

export type ProjectManifestItem = { id: number; label: unknown };

const MANIFEST_URN_PREFIX = 'urn:madoc:manifest:';

/**
 * The manifest a volunteer task is about. A task points to a manifest itself (`subject`) when the
 * project hands out whole manifests, or to one image whose parent is the manifest
 * (`subject_parent`) when it hands out single images (claimGranularity 'canvas').
 * @param task a crowdsourcing-task from Madoc
 * Returns: the manifest urn, e.g. 'urn:madoc:manifest:12', or null when the task has none.
 */
export function manifestUrnOfTask(task: MadocCrowdsourcingTaskDto): string | null {
  if (task.subject?.startsWith(MANIFEST_URN_PREFIX)) return task.subject;
  if (task.subject_parent?.startsWith(MANIFEST_URN_PREFIX)) return task.subject_parent;
  return null;
}

/**
 * Groups volunteer tasks by the id of their manifest; tasks without a manifest are left out.
 * @param tasks crowdsourcing-tasks of one project
 * Returns: manifest id (as a string, e.g. '12') -> its tasks.
 */
export function groupTasksByManifestId(tasks: MadocCrowdsourcingTaskDto[]): Map<string, MadocCrowdsourcingTaskDto[]> {
  const byManifestId = new Map<string, MadocCrowdsourcingTaskDto[]>();
  for (const task of tasks) {
    const manifestUrn = manifestUrnOfTask(task);
    if (!manifestUrn) continue;

    const manifestId = manifestUrn.slice(MANIFEST_URN_PREFIX.length);
    const existing = byManifestId.get(manifestId);
    if (existing) {
      existing.push(task);
    } else {
      byManifestId.set(manifestId, [task]);
    }
  }
  return byManifestId;
}

function countsAsTranscribed(tasks: MadocCrowdsourcingTaskDto[]): boolean {
  return tasks.some(task => task.status === 2 || task.status === 3);
}

/**
 * Share of a project's manifests that is transcribed: a manifest counts once when at least one of
 * its tasks is submitted (2) or accepted (3), however many tasks it has -- so never above 100.
 * @param manifestIds every manifest of the project
 * @param tasksByManifestId the project's tasks, from groupTasksByManifestId
 * Returns: a whole percentage, 0 when the project has no manifests.
 */
export function transcribedPercentage(manifestIds: number[], tasksByManifestId: Map<string, MadocCrowdsourcingTaskDto[]>): number {
  if (manifestIds.length === 0) return 0;
  const transcribed = manifestIds.filter(id => countsAsTranscribed(tasksByManifestId.get(String(id)) ?? [])).length;
  return Math.round((transcribed / manifestIds.length) * 100);
}

/**
 * A project's progress: how much is transcribed, and which manifests can still be picked.
 * @param input.manifestItems the manifests of the project's collection (no sub-collections)
 * @param input.thumbnails manifest id -> thumbnail URL
 * @param input.tasks every crowdsourcing-task of the project
 * @param input.config the project's Madoc config
 * Returns: the ProjectProgressDto the /progress route sends.
 */
export function computeProjectProgress(input: {
  manifestItems: ProjectManifestItem[];
  thumbnails: Map<number, string | undefined>;
  tasks: MadocCrowdsourcingTaskDto[];
  config: MadocProjectConfig;
}): ProjectProgressDto {
  const { manifestItems, thumbnails, tasks, config } = input;
  const tasksByManifestId = groupTasksByManifestId(tasks);

  // Which manifests can still be picked -- the same for every visitor, not per user. A manifest
  // is no longer offered when:
  // - it is done: status 3 (accepted), or status 2 (submitted) when the project is in
  //   'transcription' mode. This is the rule Madoc itself uses (assign-random-resource.ts).
  // - enough volunteers already work on it (the project's maxContributionsPerResource).
  const maxContributors = config.maxContributionsPerResource;
  const isTranscriberMode = config.contributionMode === 'transcription';

  const availableManifests = manifestItems.filter(item => {
    const manifestTasks = (tasksByManifestId.get(String(item.id)) ?? []).filter(task => task.status !== -1);
    if (manifestTasks.length === 0) return true;
    if (manifestTasks.some(task => task.status === 3 || (isTranscriberMode && task.status === 2))) return false;

    const contributors = new Set(manifestTasks.flatMap(task => (task.assignee ? [task.assignee.id] : [])));
    if (maxContributors && contributors.size >= maxContributors) return false;
    return true;
  });

  return {
    transcribedPercentage: transcribedPercentage(
      manifestItems.map(item => item.id),
      tasksByManifestId
    ),
    totalTasks: manifestItems.length,
    allTasksTaken: manifestItems.length > 0 && availableManifests.length === 0,
    availableManifests: availableManifests.map(item => ({
      id: item.id,
      label: item.label,
      thumbnail: thumbnails.get(item.id),
    })),
  };
}

/**
 * Per manifest, every task and whether it counts as transcribed -- for the admin's task-debug
 * view, so a percentage on the project page can be checked by hand.
 * @param manifestItems the manifests of the project's collection (no sub-collections)
 * @param tasks every crowdsourcing-task of the project
 * Returns: the ProjectDebugDto the /task-debug route sends; its percentage equals /progress's.
 */
export function computeTaskDebug(manifestItems: ProjectManifestItem[], tasks: MadocCrowdsourcingTaskDto[]): ProjectDebugDto {
  const tasksByManifestId = groupTasksByManifestId(tasks);

  const manifests = manifestItems.map(item => {
    const manifestTasks = tasksByManifestId.get(String(item.id)) ?? [];
    return {
      manifestId: item.id,
      label: item.label as MadocInternationalString | string | undefined,
      countsAsTranscribed: countsAsTranscribed(manifestTasks),
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

  return {
    totalManifests: manifests.length,
    transcribedPercentage: transcribedPercentage(
      manifestItems.map(item => item.id),
      tasksByManifestId
    ),
    manifests,
  };
}
