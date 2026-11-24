import { describe, expect, it } from 'vitest';
import { MadocCrowdsourcingTaskDto, MadocProjectDto } from '@dissco-cs/shared-types';

import { missingOriginalTaskIds, OriginalTask, parseUserId, toReviewTaskListDto, toReviewTaskRow } from '../../src/logic/review.logic';

function review(id: string, originalTaskId: string | undefined): MadocCrowdsourcingTaskDto {
  return {
    id,
    status: 1,
    status_text: 'in review',
    root_task: 'root-1',
    parameters: originalTaskId === undefined ? [] : [originalTaskId, 'manifest'],
    assignee: { id: 'urn:madoc:user:9', name: 'Reviewer' },
    modified_at: 1000,
    metadata: { subject: { id: 12, type: 'manifest', label: 'Sheet 12' } },
  };
}

const original: OriginalTask = { id: 'orig-1', assignee: { id: 'urn:madoc:user:5', name: 'Volunteer' }, state: { revisionId: 'rev-1' } };
const project = { id: 3, slug: 'labels', label: { en: ['Labels'] } } as MadocProjectDto;

describe('parseUserId', () => {
  it('reads the id from a Madoc user urn, and nothing else', () => {
    expect(parseUserId('urn:madoc:user:5')).toBe(5);
    expect(parseUserId('urn:madoc:site:5')).toBeUndefined();
    expect(parseUserId(undefined)).toBeUndefined();
  });
});

describe('toReviewTaskRow', () => {
  it('takes the submitter and revision from the original task, the reviewer from the review', () => {
    expect(toReviewTaskRow(review('r1', 'orig-1'), original, project)).toEqual({
      id: 'r1',
      project: { id: 3, slug: 'labels', label: { en: ['Labels'] } },
      subject: { id: 12, label: 'Sheet 12' },
      subjectRaw: undefined,
      subjectParentRaw: undefined,
      status: 1,
      statusText: 'in review',
      submitter: 'Volunteer',
      submitterId: 5,
      reviewer: 'Reviewer',
      reviewerId: 9,
      originalTaskId: 'orig-1',
      revisionId: 'rev-1',
      modifiedAt: 1000,
    });
  });

  it('leaves submitter, revision and project empty when they could not be looked up', () => {
    const row = toReviewTaskRow(review('r1', 'orig-1'), undefined, null);
    expect([row.submitter, row.submitterId, row.revisionId, row.project]).toEqual([undefined, undefined, undefined, {}]);
    expect(row.originalTaskId).toBe('orig-1');
  });
});

describe('toReviewTaskListDto', () => {
  it('joins every review with what was found, and is complete when no lookup failed', () => {
    const list = toReviewTaskListDto({
      reviewTasks: [review('r1', 'orig-1'), review('r2', 'orig-2')],
      originalsById: new Map([['orig-1', original]]),
      projectByRootTask: new Map([['root-1', project]]),
      errors: [],
    });
    expect(list.incomplete).toBe(false);
    expect(list.tasks.map(row => [row.id, row.submitter, row.project.slug])).toEqual([
      ['r1', 'Volunteer', 'labels'],
      ['r2', undefined, 'labels'],
    ]);
  });

  it('is marked incomplete when a lookup failed, and still lists every review', () => {
    const list = toReviewTaskListDto({
      reviewTasks: [review('r1', 'orig-1')],
      originalsById: new Map(),
      projectByRootTask: new Map(),
      errors: [new Error('Madoc down')],
    });
    expect(list.incomplete).toBe(true);
    expect(list.tasks.map(row => row.id)).toEqual(['r1']);
  });
});

describe('missingOriginalTaskIds', () => {
  it('lists the original tasks not found yet, each once, and skips reviews without one', () => {
    const found = new Map([['orig-1', original]]);
    const reviews = [review('r1', 'orig-1'), review('r2', 'orig-2'), review('r3', 'orig-2'), review('r4', undefined)];
    expect(missingOriginalTaskIds(reviews, found)).toEqual(['orig-2']);
  });
});
