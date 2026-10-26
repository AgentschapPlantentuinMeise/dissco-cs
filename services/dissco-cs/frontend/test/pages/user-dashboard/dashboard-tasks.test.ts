import { describe, expect, it } from 'vitest';
import { MadocCrowdsourcingTaskDto } from '@dissco-cs/shared-types';

import {
  filterTasks,
  bestMonth,
  firstContribution,
  monthlyCounts,
  nextMilestone,
  sharePercentage,
  sortTasks,
  summarizeTasks,
  taskProjectOptions,
  tasksPerInstitution,
} from '../../../src/pages/user-dashboard/dashboard-tasks';

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

const herbs = { id: 3, slug: 'herbs', label: { nl: ['Kruiden'], en: ['Herbs'] } };
const list = [
  task({ id: 'a', name: 'Jan: Etiket 12', modified_at: 300, metadata: { project: fungi } }),
  task({ id: 'b', name: 'Jan: Brief 4', modified_at: 100, metadata: { project: herbs } }),
  task({ id: 'c', name: 'Jan: Album 7', modified_at: 200, metadata: { project: birds } }),
];

describe('filterTasks', () => {
  it('searches the task name and the project name, ignoring case', () => {
    expect(filterTasks(list, { query: 'brief', projectId: '' }, 'nl', 'Jan').map(t => t.id)).toEqual(['b']);
    expect(filterTasks(list, { query: 'KRUID', projectId: '' }, 'nl', 'Jan').map(t => t.id)).toEqual(['b']);
  });

  it("does not match the user's own name in the prefix", () => {
    expect(filterTasks(list, { query: 'jan', projectId: '' }, 'nl', 'Jan')).toEqual([]);
  });

  it('keeps only the chosen project, combined with the search', () => {
    expect(filterTasks(list, { query: '', projectId: '2' }, 'nl', 'Jan').map(t => t.id)).toEqual(['c']);
    expect(filterTasks(list, { query: 'etiket', projectId: '2' }, 'nl', 'Jan')).toEqual([]);
  });

  it('gives everything without a filter', () => {
    expect(filterTasks(list, { query: '  ', projectId: '' }, 'nl', 'Jan')).toHaveLength(3);
  });
});

describe('sortTasks', () => {
  it('puts the most recently modified first by default', () => {
    expect(sortTasks(list, 'date', 'nl', 'Jan').map(t => t.id)).toEqual(['a', 'c', 'b']);
  });

  it('sorts by task name without the prefix, and by project name', () => {
    expect(sortTasks(list, 'name', 'nl', 'Jan').map(t => t.id)).toEqual(['c', 'b', 'a']);
    expect(sortTasks(list, 'project', 'nl', 'Jan').map(t => t.id)).toEqual(['c', 'a', 'b']);
  });

  it('leaves the original list alone', () => {
    sortTasks(list, 'name', 'nl', 'Jan');
    expect(list.map(t => t.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('taskProjectOptions', () => {
  it('gives each project once, by name, in the site language', () => {
    expect(taskProjectOptions([...list, list[0]], 'en')).toEqual([
      { id: '2', name: 'birds' },
      { id: '1', name: 'fungi' },
      { id: '3', name: 'Herbs' },
    ]);
  });
});

// Local dates, so the months do not shift with the time zone the tests run in.
const at = (year: number, month: number, day = 15) => new Date(year, month, day).getTime();
const now = new Date(2026, 9, 21);

describe('monthlyCounts', () => {
  it('gives the last 12 months, oldest first, the current one included', () => {
    const months = monthlyCounts([], now);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ year: 2025, month: 10, count: 0 });
    expect(months[11]).toEqual({ year: 2026, month: 9, count: 0 });
  });

  it('counts tasks in their month and leaves out older or undated ones', () => {
    const months = monthlyCounts(
      [
        task({ id: 'a', modified_at: at(2026, 9, 1) }),
        task({ id: 'b', modified_at: at(2026, 9, 20) }),
        task({ id: 'c', modified_at: at(2025, 10, 30) }),
        task({ id: 'd', modified_at: at(2025, 9, 31) }),
        task({ id: 'e', modified_at: undefined }),
      ],
      now
    );
    expect(months[11].count).toBe(2);
    expect(months[0].count).toBe(1);
    expect(months.reduce((sum, m) => sum + m.count, 0)).toBe(3);
  });
});

describe('bestMonth', () => {
  it('takes the month with the most tasks, the latest on a tie', () => {
    const months = [
      { year: 2026, month: 1, count: 4 },
      { year: 2026, month: 2, count: 1 },
      { year: 2026, month: 3, count: 4 },
    ];
    expect(bestMonth(months)).toEqual({ year: 2026, month: 3, count: 4 });
  });

  it('gives null without any task', () => {
    expect(bestMonth([{ year: 2026, month: 1, count: 0 }])).toBeNull();
  });
});

describe('firstContribution', () => {
  it('gives the earliest date, or null without dates', () => {
    expect(firstContribution([task({ modified_at: 300 }), task({ modified_at: 100 }), task({ modified_at: undefined })])).toBe(100);
    expect(firstContribution([task({ modified_at: undefined })])).toBeNull();
  });
});

describe('nextMilestone', () => {
  it('steps through 10, 25, 50, 100, 250, 500, 1000', () => {
    expect(nextMilestone(0)).toEqual({ previous: 0, next: 10 });
    expect(nextMilestone(10)).toEqual({ previous: 10, next: 25 });
    expect(nextMilestone(42)).toEqual({ previous: 25, next: 50 });
    expect(nextMilestone(999)).toEqual({ previous: 500, next: 1000 });
  });

  it('goes on per thousand', () => {
    expect(nextMilestone(1000)).toEqual({ previous: 1000, next: 2000 });
    expect(nextMilestone(2345)).toEqual({ previous: 2000, next: 3000 });
  });
});

describe('tasksPerInstitution', () => {
  it('counts per linked institution, the most first, and leaves out projects without one', () => {
    const counts = tasksPerInstitution(
      [
        task({ id: 'a', metadata: { project: fungi } }),
        task({ id: 'b', metadata: { project: birds } }),
        task({ id: 'c', metadata: { project: birds } }),
        task({ id: 'd', metadata: { project: herbs } }),
        task({ id: 'e', metadata: undefined }),
      ],
      { fungi: 7, birds: 9 }
    );
    expect(counts).toEqual([
      { institutionId: 9, count: 2 },
      { institutionId: 7, count: 1 },
    ]);
  });
});
