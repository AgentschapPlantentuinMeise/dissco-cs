import { describe, expect, it } from 'vitest';
import { MadocCrowdsourcingTaskDto } from '@dissco-cs/shared-types';

import { taskDisplayName } from '../../src/utility/task-display-name';

function task(name: string | undefined): MadocCrowdsourcingTaskDto {
  return { id: 't', status: 1, name };
}

describe('taskDisplayName', () => {
  it("strips the user's own prefix, and only that", () => {
    expect(taskDisplayName(task('Jan: Etiket 12'), 'Jan')).toBe('Etiket 12');
    expect(taskDisplayName(task('Piet: Etiket 12'), 'Jan')).toBe('Piet: Etiket 12');
    expect(taskDisplayName(task(undefined), 'Jan')).toBe('');
  });
});
