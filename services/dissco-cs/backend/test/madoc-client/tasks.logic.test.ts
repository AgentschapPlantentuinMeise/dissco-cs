import { describe, expect, it } from 'vitest';

import { shouldReopenManifest } from '../../src/madoc-client/tasks.logic.js';

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
