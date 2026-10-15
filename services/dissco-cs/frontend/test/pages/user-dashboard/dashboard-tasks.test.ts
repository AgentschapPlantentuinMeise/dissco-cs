import { describe, expect, it } from 'vitest';
import { MadocCrowdsourcingTaskDto } from '@dissco-cs/shared-types';

import { sharePercentage, summarizeTasks } from '../../../src/pages/user-dashboard/dashboard-tasks';

const fungi = { id: 1, slug: 'fungi' };
const birds = { id: 2, slug: 'birds' };

function task(overrides: Partial<MadocCrowdsourcingTaskDto>): MadocCrowdsourcingTaskDto {
  return { id: 't', status: 1, subject: 's', root_task: 'r', modified_at: 1, metadata: { project: fungi }, ...overrides };
}

describe('summarizeTasks', () => {
  it('removes duplicates and leaves out unstarted and abandoned claims', () => {
    const summary = summarizeTasks([
      task({ id: 'a', subject: 's1' }),
      task({ id: 'a', subject: 's1' }),
      task({ id: 'b', subject: 's2', status: 0 }),
      task({ id: 'c', subject: 's3', status: -1 }),
    ]);
    expect(summary.contributedTasks.map(t => t.id)).toEqual(['a']);
  });

  it('keeps only the latest task per object', () => {
    const summary = summarizeTasks([
      task({ id: 'old', subject: 's1', status: 2, modified_at: 100 }),
      task({ id: 'new', subject: 's1', status: 1, modified_at: 200 }),
      task({ id: 'other-root', subject: 's1', root_task: 'r2', status: 2 }),
    ]);
    expect(summary.contributedTasks.map(t => t.id).sort()).toEqual(['new', 'other-root']);
  });

  it('groups saved (1) and done (2, 3, 5) tasks', () => {
    const summary = summarizeTasks([
      task({ id: 'a', subject: 's1', status: 1 }),
      task({ id: 'b', subject: 's2', status: 2 }),
      task({ id: 'c', subject: 's3', status: 3 }),
      task({ id: 'd', subject: 's4', status: 5 }),
    ]);
    expect(summary.savedTasks.map(t => t.id)).toEqual(['a']);
    expect(summary.doneTasks.map(t => t.id)).toEqual(['b', 'c', 'd']);
  });

  it("counts completed tasks like the backend: status 2 and 3 of every task, also an older one of the same object", () => {
    const summary = summarizeTasks([
      task({ id: 'a', subject: 's1', status: 2, modified_at: 100 }),
      task({ id: 'b', subject: 's1', status: 3, modified_at: 200 }),
      task({ id: 'c', subject: 's2', status: 5 }),
    ]);
    expect(summary.userDoneCount).toBe(2);
  });

  it('counts tasks per project', () => {
    const summary = summarizeTasks([
      task({ id: 'a', subject: 's1' }),
      task({ id: 'b', subject: 's2' }),
      task({ id: 'c', subject: 's3', metadata: { project: birds } }),
      task({ id: 'd', subject: 's4', metadata: undefined }),
    ]);
    expect(summary.projectCount).toBe(2);
    expect(summary.projectTaskCounts.map(({ id, value }) => ({ id, value }))).toEqual([
      { id: '1', value: 2 },
      { id: '2', value: 1 },
    ]);
  });
});

describe('sharePercentage', () => {
  it('gives two decimals, or null without site total', () => {
    expect(sharePercentage(1, 3)).toBe('33.33');
    expect(sharePercentage(5, 0)).toBeNull();
  });
});
