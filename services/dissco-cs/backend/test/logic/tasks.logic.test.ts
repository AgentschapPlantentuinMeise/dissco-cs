import { describe, expect, it } from 'vitest';

import { shouldReopenManifest, toMyTask } from '../../src/logic/tasks.logic.js';

function claims(...statuses: number[]) {
  return statuses.map(status => ({ type: 'crowdsourcing-task', status }));
}

describe('shouldReopenManifest', () => {
  it('reopens a full manifest (status 2) that has room again', () => {
    expect(shouldReopenManifest({ status: 2, state: { maxContributors: 2 }, subtasks: claims(1) })).toBe(true);
  });

  it('keeps a manifest closed while it is still full', () => {
    expect(shouldReopenManifest({ status: 2, state: { maxContributors: 2 }, subtasks: claims(1, 2) })).toBe(false);
  });

  it('does not count abandoned claims (status -1)', () => {
    expect(shouldReopenManifest({ status: 2, state: { maxContributors: 2 }, subtasks: claims(1, -1, -1) })).toBe(true);
  });

  it('only counts crowdsourcing-task subtasks as claims', () => {
    const subtasks = [...claims(1), { type: 'crowdsourcing-review', status: 1 }];
    expect(shouldReopenManifest({ status: 2, state: { maxContributors: 2 }, subtasks })).toBe(true);
  });

  it('does nothing when the project sets no maximum', () => {
    expect(shouldReopenManifest({ status: 2, state: {}, subtasks: [] })).toBe(false);
  });

  it.each([1, 3, -1])('leaves a manifest with status %i alone', status => {
    expect(shouldReopenManifest({ status, state: { maxContributors: 2 }, subtasks: [] })).toBe(false);
  });
});

describe('toMyTask', () => {
  it('keeps only the fields the dashboard uses', () => {
    const task = {
      id: 't1',
      name: 'Ann: Asplenium bullatum',
      status: 3,
      status_text: 'accepted',
      subject: 'urn:madoc:manifest:86',
      subject_parent: '',
      root_task: 'r1',
      modified_at: 1764000000000,
      parameters: ['p1', null, 'manifest'],
      state: { revisionId: 'rev1' },
      metadata: {
        project: { id: 3, slug: 'review-project', label: { en: ['Review project'] } },
        subject: { id: 86, type: 'manifest', label: { de: ['Asplenium bullatum'] }, thumbnail: 'https://example.org/thumb.jpg' },
      },
    };
    expect(toMyTask(task)).toEqual({
      id: 't1',
      name: 'Ann: Asplenium bullatum',
      status: 3,
      subject: 'urn:madoc:manifest:86',
      rootTask: 'r1',
      modifiedAt: 1764000000000,
      project: { id: 3, slug: 'review-project', label: { en: ['Review project'] } },
    });
  });

  it('turns fields Madoc did not send into null, and a missing name into an empty one', () => {
    expect(toMyTask({ id: 't2', status: 1 })).toEqual({
      id: 't2',
      name: '',
      status: 1,
      subject: null,
      rootTask: null,
      modifiedAt: null,
      project: null,
    });
  });
});
