import { describe, expect, it } from 'vitest';

import { MadocCrowdsourcingTaskDto } from '@dissco-cs/shared-types';
import {
  computeProjectProgress,
  computeTaskDebug,
  groupTasksByManifestId,
  manifestUrnOfTask,
  transcribedPercentage,
} from '../../src/controllers/projects.logic.js';

let nextId = 1;

// A volunteer task on one image (claimGranularity 'canvas'): the manifest is its subject_parent.
function canvasTask(manifestId: number, status: number, assignee?: string): MadocCrowdsourcingTaskDto {
  const id = nextId++;
  return {
    id: `task-${id}`,
    status,
    subject: `urn:madoc:canvas:${id}`,
    subject_parent: `urn:madoc:manifest:${manifestId}`,
    assignee: assignee ? { id: assignee, name: assignee } : undefined,
  };
}

// A volunteer task on a whole manifest (claimGranularity 'manifest'): the manifest is its subject.
function manifestTask(manifestId: number, status: number, assignee?: string): MadocCrowdsourcingTaskDto {
  return {
    id: `task-${nextId++}`,
    status,
    subject: `urn:madoc:manifest:${manifestId}`,
    assignee: assignee ? { id: assignee, name: assignee } : undefined,
  };
}

function manifests(...ids: number[]) {
  return ids.map(id => ({ id, label: { en: [`Manifest ${id}`] } }));
}

function progress(manifestIds: number[], tasks: MadocCrowdsourcingTaskDto[], config = {}) {
  return computeProjectProgress({ manifestItems: manifests(...manifestIds), thumbnails: new Map(), tasks, config });
}

function availableIds(result: ReturnType<typeof progress>) {
  return result.availableManifests.map(m => m.id);
}

describe('manifestUrnOfTask', () => {
  it('reads the manifest from subject when the task is about a whole manifest', () => {
    expect(manifestUrnOfTask(manifestTask(4, 1))).toBe('urn:madoc:manifest:4');
  });

  it('reads the manifest from subject_parent when the task is about one image', () => {
    expect(manifestUrnOfTask(canvasTask(4, 1))).toBe('urn:madoc:manifest:4');
  });

  it('returns null when the task points to no manifest', () => {
    expect(manifestUrnOfTask({ id: 't', status: 1, subject: 'urn:madoc:canvas:9' })).toBeNull();
  });
});

describe('groupTasksByManifestId', () => {
  it('groups by manifest id and leaves out tasks without a manifest', () => {
    const a = canvasTask(1, 1);
    const b = canvasTask(1, 2);
    const c = manifestTask(2, 3);
    const grouped = groupTasksByManifestId([a, b, c, { id: 'x', status: 1 }]);
    expect([...grouped.keys()]).toEqual(['1', '2']);
    expect(grouped.get('1')).toEqual([a, b]);
  });
});

describe('transcribedPercentage', () => {
  // Regression: the percentage used Madoc's task stats (one per image with claimGranularity
  // 'canvas') divided by the number of manifests, so 5 submitted images on 2 manifests gave 250%.
  it('counts a manifest once, however many of its images are submitted', () => {
    const tasks = [canvasTask(1, 2), canvasTask(1, 2), canvasTask(1, 3), canvasTask(2, 2), canvasTask(2, 3)];
    expect(transcribedPercentage([1, 2], groupTasksByManifestId(tasks))).toBe(100);
  });

  it('counts a manifest once when several volunteers submitted it', () => {
    const tasks = [manifestTask(1, 2, 'anna'), manifestTask(1, 3, 'bert')];
    expect(transcribedPercentage([1, 2], groupTasksByManifestId(tasks))).toBe(50);
  });

  it.each([0, 1, -1])('does not count a manifest whose only task has status %i', status => {
    expect(transcribedPercentage([1], groupTasksByManifestId([manifestTask(1, status)]))).toBe(0);
  });

  it('rounds to a whole percentage', () => {
    expect(transcribedPercentage([1, 2, 3], groupTasksByManifestId([manifestTask(1, 3)]))).toBe(33);
  });

  it('is 0 for a project without manifests', () => {
    expect(transcribedPercentage([], new Map())).toBe(0);
  });
});

describe('computeProjectProgress: available manifests', () => {
  it('offers a manifest nobody has worked on', () => {
    expect(availableIds(progress([1], []))).toEqual([1]);
  });

  it('never offers a manifest with an accepted task (status 3)', () => {
    expect(availableIds(progress([1, 2], [manifestTask(1, 3)]))).toEqual([2]);
  });

  it("keeps offering a submitted manifest (status 2) unless the project is in 'transcription' mode", () => {
    const tasks = [manifestTask(1, 2, 'anna')];
    expect(availableIds(progress([1], tasks))).toEqual([1]);
    expect(availableIds(progress([1], tasks, { contributionMode: 'transcription' }))).toEqual([]);
  });

  it('stops offering a manifest once it has the maximum number of volunteers', () => {
    const tasks = [manifestTask(1, 1, 'anna'), manifestTask(2, 1, 'anna'), manifestTask(2, 1, 'bert')];
    expect(availableIds(progress([1, 2], tasks, { maxContributionsPerResource: 2 }))).toEqual([1]);
  });

  it('keeps offering a manifest when the project sets no maximum', () => {
    const tasks = [manifestTask(1, 1, 'anna'), manifestTask(1, 1, 'bert'), manifestTask(1, 1, 'chris')];
    expect(availableIds(progress([1], tasks))).toEqual([1]);
  });

  it('does not count an abandoned task (status -1) as a volunteer or as done', () => {
    const tasks = [manifestTask(1, -1, 'anna'), manifestTask(1, 1, 'bert')];
    expect(availableIds(progress([1], tasks, { maxContributionsPerResource: 2 }))).toEqual([1]);
  });

  it('counts one volunteer once, even with several images of the same manifest', () => {
    const tasks = [canvasTask(1, 1, 'anna'), canvasTask(1, 1, 'anna')];
    expect(availableIds(progress([1], tasks, { maxContributionsPerResource: 2 }))).toEqual([1]);
  });

  it('reports allTasksTaken only when a project with manifests has none left', () => {
    expect(progress([1], [manifestTask(1, 3)]).allTasksTaken).toBe(true);
    expect(progress([1, 2], [manifestTask(1, 3)]).allTasksTaken).toBe(false);
    expect(progress([], []).allTasksTaken).toBe(false);
  });

  it('adds the thumbnail of each manifest', () => {
    const result = computeProjectProgress({
      manifestItems: manifests(1, 2),
      thumbnails: new Map([[2, 'https://example.org/2.jpg']]),
      tasks: [],
      config: {},
    });
    expect(result.availableManifests.map(m => m.thumbnail)).toEqual([undefined, 'https://example.org/2.jpg']);
    expect(result.totalTasks).toBe(2);
  });
});

describe('computeTaskDebug', () => {
  it('lists every manifest with its tasks, also a manifest without tasks', () => {
    const task = { ...manifestTask(1, 2, 'anna'), status_text: 'in review', modified_at: 1700000000000 };
    const result = computeTaskDebug(manifests(1, 2), [task]);
    expect(result.totalManifests).toBe(2);
    expect(result.manifests[0]).toMatchObject({
      manifestId: 1,
      countsAsTranscribed: true,
      tasks: [{ id: task.id, status: 2, statusText: 'in review', assignee: 'anna', modifiedAt: 1700000000000 }],
    });
    expect(result.manifests[1]).toMatchObject({ manifestId: 2, countsAsTranscribed: false, tasks: [] });
  });

  it('falls back to 0 when Madoc sends no modified_at', () => {
    expect(computeTaskDebug(manifests(1), [manifestTask(1, 1)]).manifests[0].tasks[0].modifiedAt).toBe(0);
  });

  it('shows the same percentage as the project page', () => {
    const tasks = [canvasTask(1, 2), canvasTask(1, 3), canvasTask(2, 1), canvasTask(3, 3)];
    expect(computeTaskDebug(manifests(1, 2, 3), tasks).transcribedPercentage).toBe(
      progress([1, 2, 3], tasks).transcribedPercentage
    );
  });
});
